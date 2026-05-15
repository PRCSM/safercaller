/**
 * SAFERCALLER Cloud Functions — Phase 8 implementation.
 *
 * Exports:
 *   1. onScamReportCreated     — Firestore onCreate scamReports/{id}
 *   2. onScamReportResolved    — Firestore onUpdate scamReports/{id} (status → resolved)
 *   3. getAIProfessions        — HTTPS callable, model-fetched + Firestore-cached
 *   4. autoDeleteExpiredListings — Scheduled (every 24h)
 *   5. computeReputationScore  — HTTPS callable, recompute from reports + ratings
 *   6. dispatchChatFCM         — Firestore onCreate chats/{chatId}/messages/{msgId}
 *   + ping                     — smoke-test HTTPS endpoint
 */

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// ─── Constants ──────────────────────────────────────────────────────────

const SAFE_DEFAULT_SCORE = 900;
const MIN_SCORE = 0;
const MAX_SCORE = 1000;

// Penalty applied to a scammer's reputationScore per report category.
// Mirrors the lookupNumber min() math in src/services/scamService.js.
const CATEGORY_PENALTY = {
  fraud: 200,
  scam: 200,
  harassment: 150,
  threat: 175,
  spam: 50,
  telemarketing: 30,
  robocall: 40,
  other: 75,
};

// Fallback profession list used when OpenAI is unavailable AND
// config/professions has not been seeded yet.
const DEFAULT_PROFESSIONS = [
  'Software Engineer', 'Doctor', 'Teacher', 'Accountant', 'Lawyer',
  'Architect', 'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer',
  'Nurse', 'Pharmacist', 'Dentist', 'Veterinarian', 'Police Officer',
  'Firefighter', 'Soldier', 'Pilot', 'Driver', 'Plumber', 'Electrician',
  'Carpenter', 'Mechanic', 'Chef', 'Baker', 'Tailor', 'Photographer',
  'Designer', 'Journalist', 'Writer', 'Translator', 'Banker', 'Insurance Agent',
  'Real Estate Agent', 'Shopkeeper', 'Farmer', 'Fisherman', 'Construction Worker',
  'Cleaner', 'Security Guard', 'Receptionist', 'Sales Executive',
  'Marketing Manager', 'HR Manager', 'Project Manager', 'Consultant',
  'Researcher', 'Scientist', 'Professor', 'Student', 'Driver - Cab',
  'Driver - Truck', 'Delivery Agent', 'Tutor', 'Beautician', 'Fitness Trainer',
  'Musician', 'Actor', 'Athlete', 'Government Officer', 'Other',
];

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ─── Utilities ──────────────────────────────────────────────────────────

const penaltyFor = (category) =>
  CATEGORY_PENALTY[(category || '').toLowerCase()] ?? CATEGORY_PENALTY.other;

const clampScore = (n) => Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(n)));

/**
 * Send an FCM message and clean up the token if the device is no longer
 * registered. Swallows other errors after logging — never let an FCM
 * failure abort the trigger.
 */
async function sendFCMSafe(uid, message) {
  try {
    await messaging.send(message);
    return true;
  } catch (err) {
    logger.warn('FCM send failed', { uid, code: err.code, msg: err.message });
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      try {
        await db.collection('users').doc(uid).update({ fcmToken: FieldValue.delete() });
      } catch (_) { /* ignore */ }
    }
    return false;
  }
}

/**
 * Recompute a user's reputationScore from scratch.
 *
 * Score = SAFE_DEFAULT_SCORE
 *       − sum(penalty for each open report)
 *       − sum(penalty/2 for each resolved report)
 *       + ratings bonus (weighted-avg listing rating, ±40 pts max)
 *       + verification bonus (verified +50, idProof +30)
 *
 * Clamped to [MIN_SCORE, MAX_SCORE]. Persisted to users/{uid}.
 */
async function recomputeScoreFromReports(uid) {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', `User ${uid} not found`);
  }
  const userData = userSnap.data();

  let reportPenalty = 0;
  if (userData.phone) {
    const reportsSnap = await db
      .collection('scamReports')
      .where('scammerPhone', '==', userData.phone)
      .get();

    for (const r of reportsSnap.docs) {
      const data = r.data();
      const p = penaltyFor(data.category);
      reportPenalty += data.status === 'resolved' ? p / 2 : p;
    }
  }

  let ratingBonus = 0;
  const listingsSnap = await db
    .collection('listings')
    .where('sellerId', '==', uid)
    .get();

  let totalReviews = 0;
  let weightedSum = 0;
  for (const l of listingsSnap.docs) {
    const data = l.data();
    if (typeof data.avgRating === 'number' && (data.reviewCount ?? 0) > 0) {
      totalReviews += data.reviewCount;
      weightedSum += data.avgRating * data.reviewCount;
    }
  }
  if (totalReviews > 0) {
    const avg = weightedSum / totalReviews; // 0–5
    ratingBonus = (avg - 3) * 20; // 5★ → +40, 3★ → 0, 1★ → −40
  }

  let verificationBonus = 0;
  if (userData.verified === true) verificationBonus += 50;
  if (userData.idProofUrl) verificationBonus += 30;

  const finalScore = clampScore(
    SAFE_DEFAULT_SCORE - reportPenalty + ratingBonus + verificationBonus,
  );

  await db.collection('users').doc(uid).update({
    reputationScore: finalScore,
    reputationUpdatedAt: FieldValue.serverTimestamp(),
  });

  return finalScore;
}

// ─── 1. onScamReportCreated ─────────────────────────────────────────────
//
// Trigger: scamReports/{reportId} create.
// Effects:
//   • Resolve scammer's user doc by phone (if registered).
//   • Stamp the report with reputationScore + scammerUid for fast lookup.
//   • Update the scammer's user doc reputationScore + reportCount.
//   • Send an FCM "you have been reported" to the scammer.

exports.onScamReportCreated = onDocumentCreated(
  { document: 'scamReports/{reportId}', region: 'us-central1' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const report = snap.data();
    const reportId = event.params.reportId;
    const penalty = penaltyFor(report.category);

    let scammerUid = null;
    let scammerToken = null;
    let currentScore = SAFE_DEFAULT_SCORE;

    if (report.scammerPhone) {
      const userQ = await db
        .collection('users')
        .where('phone', '==', report.scammerPhone)
        .limit(1)
        .get();

      if (!userQ.empty) {
        const userDoc = userQ.docs[0];
        scammerUid = userDoc.id;
        const userData = userDoc.data();
        scammerToken = userData.fcmToken ?? null;
        currentScore =
          typeof userData.reputationScore === 'number'
            ? userData.reputationScore
            : SAFE_DEFAULT_SCORE;
      }
    }

    const newScore = clampScore(currentScore - penalty);

    await snap.ref.update({
      reputationScore: newScore,
      scammerUid,
      processedAt: FieldValue.serverTimestamp(),
    });

    if (scammerUid) {
      await db.collection('users').doc(scammerUid).update({
        reputationScore: newScore,
        reportCount: FieldValue.increment(1),
        lastReportedAt: FieldValue.serverTimestamp(),
      });
    }

    if (scammerToken) {
      await sendFCMSafe(scammerUid, {
        token: scammerToken,
        notification: {
          title: 'You have been reported',
          body: `A new ${report.category || 'scam'} report was filed against your number.`,
        },
        data: {
          type: 'scam_report',
          reportId,
          category: report.category || 'other',
        },
        android: { priority: 'high', notification: { channelId: 'scam_reports' } },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    }

    logger.info('Scam report processed', { reportId, scammerUid, newScore, penalty });
  },
);

// ─── 2. onScamReportResolved ────────────────────────────────────────────
//
// Trigger: scamReports/{reportId} update where status → 'resolved'.
// Effects:
//   • Restore half the original penalty on the report doc.
//   • Recompute the scammer user doc score from all reports.
//   • Notify the original reporter.

exports.onScamReportResolved = onDocumentUpdated(
  { document: 'scamReports/{reportId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only fire on the transition INTO 'resolved'.
    if (before.status === 'resolved' || after.status !== 'resolved') return;

    const reportId = event.params.reportId;
    const penalty = penaltyFor(after.category);
    const restore = Math.floor(penalty / 2);

    const oldScore =
      typeof after.reputationScore === 'number'
        ? after.reputationScore
        : SAFE_DEFAULT_SCORE;

    await event.data.after.ref.update({
      reputationScore: clampScore(oldScore + restore),
      resolvedAt: FieldValue.serverTimestamp(),
    });

    if (after.scammerUid) {
      try {
        await recomputeScoreFromReports(after.scammerUid);
      } catch (err) {
        logger.warn('recompute after resolve failed', { uid: after.scammerUid, err: err.message });
      }
    }

    if (after.reportedBy) {
      try {
        const reporterSnap = await db.collection('users').doc(after.reportedBy).get();
        const token = reporterSnap.exists ? reporterSnap.data().fcmToken : null;
        if (token) {
          await sendFCMSafe(after.reportedBy, {
            token,
            notification: {
              title: 'Report resolved',
              body: 'Your scam report has been marked resolved.',
            },
            data: { type: 'scam_resolved', reportId },
            android: { priority: 'high', notification: { channelId: 'scam_reports' } },
            apns: { payload: { aps: { sound: 'default' } } },
          });
        }
      } catch (err) {
        logger.warn('reporter notify failed', err);
      }
    }

    logger.info('Scam report resolved', { reportId, scammerUid: after.scammerUid });
  },
);

// ─── 3. getAIProfessions ────────────────────────────────────────────────
//
// HTTPS callable. Returns a profession list. Cached at config/professions
// for 7 days. Falls back to the cached doc (or DEFAULT_PROFESSIONS) if
// OpenAI is unreachable or no key is configured.
//
// Set the secret with:
//   firebase functions:secrets:set OPENAI_API_KEY

const PROFESSIONS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

exports.getAIProfessions = onCall(
  { secrets: [OPENAI_API_KEY], region: 'us-central1' },
  async (request) => {
    const cacheRef = db.collection('config').doc('professions');

    const cached = await cacheRef.get().catch(() => null);
    const cachedData = cached?.exists ? cached.data() : null;
    const cachedList = Array.isArray(cachedData?.list) ? cachedData.list : null;
    const cachedAt = cachedData?.updatedAt?.toMillis?.() ?? 0;
    const force = request.data?.refresh === true;

    if (!force && cachedList && Date.now() - cachedAt < PROFESSIONS_TTL_MS) {
      return { list: cachedList, cached: true, source: cachedData.source ?? 'cache' };
    }

    let apiKey = '';
    try {
      apiKey = OPENAI_API_KEY.value();
    } catch (_) { /* secret not set */ }

    if (!apiKey) {
      logger.warn('OPENAI_API_KEY not set — returning cached/default list');
      return {
        list: cachedList ?? DEFAULT_PROFESSIONS,
        cached: true,
        source: cachedList ? 'cache' : 'default',
      };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: 'You return JSON only. No prose.',
            },
            {
              role: 'user',
              content:
                'Generate a comprehensive list of 80 distinct professions and occupations ' +
                'common in India, suitable for a phone-directory profile dropdown. ' +
                'Include white-collar, blue-collar, self-employed, and student roles. ' +
                'Sort alphabetically. Respond exactly as: {"professions": ["Accountant", ...]}',
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenAI returned empty content');

      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed.professions)
        ? parsed.professions.filter((p) => typeof p === 'string' && p.trim().length > 0)
        : null;

      if (!list || list.length === 0) {
        throw new Error('OpenAI response missing valid professions array');
      }

      await cacheRef.set({
        list,
        updatedAt: FieldValue.serverTimestamp(),
        source: 'openai:gpt-4o-mini',
      });

      logger.info('Profession list refreshed', { count: list.length });
      return { list, cached: false, source: 'openai:gpt-4o-mini' };
    } catch (err) {
      logger.error('getAIProfessions OpenAI call failed', err);
      return {
        list: cachedList ?? DEFAULT_PROFESSIONS,
        cached: true,
        source: cachedList ? 'cache-fallback' : 'default-fallback',
        error: err.message,
      };
    }
  },
);

// ─── 4. autoDeleteExpiredListings ───────────────────────────────────────
//
// Scheduled daily. Flips listings.status 'active' → 'expired' where
// expiresAt < now, then notifies each affected seller via FCM (one
// message per seller, batched). Processes up to 500 listings per run.

exports.autoDeleteExpiredListings = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1',
    retryCount: 2,
  },
  async () => {
    const now = Timestamp.now();
    const snap = await db
      .collection('listings')
      .where('status', '==', 'active')
      .where('expiresAt', '<', now)
      .limit(500)
      .get();

    if (snap.empty) {
      logger.info('autoDeleteExpiredListings: no expired listings');
      return;
    }

    const batch = db.batch();
    const bySeller = new Map(); // sellerId → [{ listingId, title }]

    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      const data = doc.data();
      if (!data.sellerId) continue;
      const items = bySeller.get(data.sellerId) ?? [];
      items.push({ listingId: doc.id, title: data.title ?? 'Listing' });
      bySeller.set(data.sellerId, items);
    }

    await batch.commit();

    let notified = 0;
    for (const [sellerId, items] of bySeller.entries()) {
      try {
        const userSnap = await db.collection('users').doc(sellerId).get();
        const token = userSnap.exists ? userSnap.data().fcmToken : null;
        if (!token) continue;

        const sent = await sendFCMSafe(sellerId, {
          token,
          notification: {
            title: items.length === 1 ? 'Listing expired' : `${items.length} listings expired`,
            body:
              items.length === 1
                ? `"${items[0].title}" has expired. Tap to relist.`
                : 'Tap to review and relist them.',
          },
          data: {
            type: 'listing_expired',
            listingIds: items.map((i) => i.listingId).join(','),
          },
          android: { priority: 'high', notification: { channelId: 'listings' } },
          apns: { payload: { aps: { sound: 'default' } } },
        });
        if (sent) notified++;
      } catch (err) {
        logger.warn('seller notify failed', { sellerId, err: err.message });
      }
    }

    logger.info('autoDeleteExpiredListings done', {
      expired: snap.size,
      sellers: bySeller.size,
      notified,
    });
  },
);

// ─── 5. computeReputationScore ──────────────────────────────────────────
//
// HTTPS callable. Recomputes a user's reputationScore from open
// complaints + listing ratings + verification status, and writes the
// result to users/{uid}.reputationScore.
//
// Auth rules:
//   • Authenticated user can recompute their own score.
//   • Admin (custom claim admin=true) can recompute any user's score.

exports.computeReputationScore = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign-in required');
    }

    const targetUid = request.data?.uid ?? request.auth.uid;
    const isSelf = targetUid === request.auth.uid;
    const isAdmin = request.auth.token?.admin === true;

    if (!isSelf && !isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'You can only compute your own reputation score',
      );
    }

    try {
      const score = await recomputeScoreFromReports(targetUid);
      return { uid: targetUid, score };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error('computeReputationScore failed', err);
      throw new HttpsError('internal', err.message);
    }
  },
);

// ─── 6. dispatchChatFCM ─────────────────────────────────────────────────
//
// Trigger: chats/{chatId}/messages/{msgId} create.
// Effects:
//   • Look up receiver's fcmToken + sender's display name.
//   • Skip if receiver has blocked the sender.
//   • Send a chat-style FCM (collapsed by chatId) to the receiver.

exports.dispatchChatFCM = onDocumentCreated(
  { document: 'chats/{chatId}/messages/{msgId}', region: 'us-central1' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const msg = snap.data();
    if (!msg || !msg.senderId || !msg.receiverId) {
      logger.warn('dispatchChatFCM: missing sender/receiver', { msgId: event.params.msgId });
      return;
    }

    const { chatId, msgId } = event.params;

    const [receiverSnap, senderSnap] = await Promise.all([
      db.collection('users').doc(msg.receiverId).get(),
      db.collection('users').doc(msg.senderId).get(),
    ]);

    if (!receiverSnap.exists) {
      logger.warn('dispatchChatFCM: receiver not found', { receiverId: msg.receiverId });
      return;
    }

    const receiverData = receiverSnap.data();
    const token = receiverData.fcmToken;
    if (!token) {
      logger.info('dispatchChatFCM: receiver has no fcmToken, skipping', {
        receiverId: msg.receiverId,
      });
      return;
    }

    if (
      Array.isArray(receiverData.blockedUsers) &&
      receiverData.blockedUsers.includes(msg.senderId)
    ) {
      logger.info('dispatchChatFCM: sender blocked by receiver, skipping');
      return;
    }

    const senderData = senderSnap.exists ? senderSnap.data() : {};
    const senderName =
      senderData.fullName ||
      senderData.displayName ||
      senderData.name ||
      'New message';

    const rawBody =
      msg.text || (msg.mediaUrl ? '📎 Sent a media file' : 'New message');
    const body = rawBody.length > 120 ? rawBody.slice(0, 117) + '…' : rawBody;

    await sendFCMSafe(msg.receiverId, {
      token,
      notification: { title: senderName, body },
      data: {
        type: 'chat_message',
        chatId,
        msgId,
        senderId: msg.senderId,
      },
      android: {
        priority: 'high',
        notification: { channelId: 'chat_messages', tag: chatId },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1, 'thread-id': chatId },
        },
      },
    });
  },
);

// ─── ping (smoke test) ──────────────────────────────────────────────────

exports.ping = onRequest(
  { region: 'us-central1', invoker: 'public' },
  (req, res) => {
    res.json({ ok: true, service: 'safercaller-functions', at: new Date().toISOString() });
  },
);
