import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit,
  orderBy,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebaseConfig';
import { uploadFile } from './storageService';

/**
 * Real Firestore/Storage scam-reports service.
 *
 * Only reached when IS_MOCK is false. In mock mode the services barrel
 * routes to mockScamService.
 *
 * Schema: scamReports/{reportId}  (see PRD §11).
 *
 * NOTE on search: Firestore has no native full-text index. Free-text
 * matches across scammerName / email / description are done client-side
 * after a server-side narrowing query. This works fine for a small
 * dataset; once volume grows, plug Algolia (or a Cloud-Function-fed
 * search index) into searchScamReports instead.
 *
 * NOTE on lookupNumber score: the score is min(reputationScore) across
 * all reports for the number, defaulting to 900 when none exist. The
 * real reputation engine (PRD §5) computes scores on every report write
 * via Cloud Function and stores them on the scammer's user doc — flip
 * lookupNumber to read that precomputed value once it lands.
 */

const SCAM_LOOKUP_CACHE_PREFIX = 'scamLookup:';
const SCAM_LOOKUP_TTL_MS = 60 * 60 * 1000; // 1 hour
const SAFE_DEFAULT_SCORE = 900;

const scamCol = () => collection(db, 'scamReports');
const scamRef = (id) => doc(db, 'scamReports', id);

/**
 * @param {object} reportData  - matches PRD §11 schema (minus proofUrls/status)
 * @param {Array<{ uri, mimeType?, name? }>} proofFiles - up to 6 attachments
 */
export const submitScamReport = async (reportData, proofFiles = []) => {
  try {
    // Pre-allocate doc ref so the same ID is used for the Storage path
    // and the Firestore write — keeps proofs colocated under their report.
    const newRef = doc(scamCol());
    const reportId = newRef.id;

    const proofUrls = [];
    for (let i = 0; i < proofFiles.length; i++) {
      const file = proofFiles[i];
      const path = `scamProofs/${reportId}/file_${i}`;
      const url = await uploadFile(path, file.uri, file.mimeType);
      proofUrls.push(url);
    }

    await setDoc(newRef, {
      ...reportData,
      proofUrls,
      status: 'open',
      createdAt: serverTimestamp(),
    });
    return reportId;
  } catch (err) {
    console.warn('[scamService.submitScamReport]', err);
    throw err;
  }
};

/**
 * @param {string} queryText  - free-text or `+91...` phone number
 * @param {object} filters    - { category?, status? }
 */
export const searchScamReports = async (queryText = '', filters = {}) => {
  try {
    const constraints = [];

    if (filters.category && filters.category !== 'all') {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }

    // Phone-shaped query → exact match server-side (cheap, no client filter).
    const looksLikePhone = typeof queryText === 'string' && queryText.startsWith('+');
    if (looksLikePhone) {
      constraints.push(where('scammerPhone', '==', queryText));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(50));

    const snap = await getDocs(query(scamCol(), ...constraints));
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!queryText || looksLikePhone) return results;

    // Free-text client-side filter — narrow the already-server-filtered set.
    const needle = queryText.toLowerCase();
    return results.filter((r) =>
      (r.scammerName ?? '').toLowerCase().includes(needle) ||
      (r.email ?? '').toLowerCase().includes(needle) ||
      (r.description ?? '').toLowerCase().includes(needle) ||
      (r.category ?? '').toLowerCase().includes(needle)
    );
  } catch (err) {
    console.warn('[scamService.searchScamReports]', err);
    throw err;
  }
};

/**
 * Hot-path lookup — called on every incoming call. Cached in AsyncStorage
 * with a 1-hour TTL keyed by phone number. Cache is not invalidated on
 * new report writes; staleness is bounded by the TTL.
 *
 * @returns {{ isFlagged: boolean, count: number, categories: string[], score: number }}
 */
export const lookupNumber = async (phoneNumber) => {
  try {
    const cacheKey = SCAM_LOOKUP_CACHE_PREFIX + phoneNumber;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < SCAM_LOOKUP_TTL_MS) {
        return parsed.result;
      }
    }

    const snap = await getDocs(
      query(scamCol(), where('scammerPhone', '==', phoneNumber))
    );
    const reports = snap.docs.map((d) => d.data());

    const categories = [...new Set(reports.map((r) => r.category).filter(Boolean))];
    const scoreValues = reports
      .map((r) => r.reputationScore)
      .filter((s) => typeof s === 'number');
    const score = scoreValues.length ? Math.min(...scoreValues) : SAFE_DEFAULT_SCORE;

    const result = {
      isFlagged: reports.length > 0,
      count: reports.length,
      categories,
      score,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), result }));
    return result;
  } catch (err) {
    console.warn('[scamService.lookupNumber]', err);
    throw err;
  }
};

/**
 * Scammer's response to an open complaint. Flips status to 'reviewing'
 * and attaches their proof. Final 'resolved' status is set by admin
 * (manual review + payment, per PRD §5).
 */
export const submitResolveRequest = async (reportId, resolveData = {}, proofFiles = []) => {
  try {
    const proofUrls = [];
    for (let i = 0; i < proofFiles.length; i++) {
      const file = proofFiles[i];
      const path = `scamProofs/${reportId}/resolve_${Date.now()}_${i}`;
      const url = await uploadFile(path, file.uri, file.mimeType);
      proofUrls.push(url);
    }

    await updateDoc(scamRef(reportId), {
      status: 'reviewing',
      resolveNote: resolveData.resolveNote ?? '',
      resolveProofUrls: proofUrls,
      resolveSubmittedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn('[scamService.submitResolveRequest]', err);
    throw err;
  }
};
