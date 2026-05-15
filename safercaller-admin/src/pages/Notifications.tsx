import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc, collection, getDocs, query, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { db, functions, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import Badge from '../components/Badge';
import { TableSkeleton } from '../components/Skeleton';

type NotificationDoc = {
  id: string;
  title?: string;
  message?: string;
  target?: 'all' | 'verified' | 'premium';
  deliveryCount?: number;
  sentAt?: Timestamp;
};

type Target = 'all' | 'verified' | 'premium';

async function fetchHistory(): Promise<NotificationDoc[]> {
  if (IS_MOCK || !db) return MOCK_HISTORY;
  const snap = await getDocs(
    query(collection(db, 'notifications'), orderBy('sentAt', 'desc'), limit(30)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

const targetLabel: Record<Target, string> = {
  all: 'All Users',
  verified: 'Verified Only',
  premium: 'Premium Only',
};

export default function Notifications() {
  const qc = useQueryClient();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchHistory,
  });

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<Target>('all');

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error('Title and message are required.');

      // Best effort: try a Cloud Function called sendBroadcastNotification.
      // If it isn't deployed, fall back to writing a notification doc so
      // the admin still gets the audit trail.
      let deliveryCount = 0;
      if (!IS_MOCK && functions) {
        try {
          const callable = httpsCallable(functions, 'sendBroadcastNotification');
          const result = await callable({ title: title.trim(), message: message.trim(), target });
          const data = result.data as any;
          deliveryCount = Number(data?.deliveryCount ?? data?.count ?? 0);
        } catch (err) {
          // Function not deployed yet — log the broadcast intent to Firestore.
          console.warn('sendBroadcastNotification callable failed:', err);
        }
      }

      if (!IS_MOCK && db) {
        await addDoc(collection(db, 'notifications'), {
          title: title.trim(),
          message: message.trim(),
          target,
          deliveryCount,
          sentAt: serverTimestamp(),
        });
      }
      return deliveryCount;
    },
    onSuccess: (count) => {
      toast.success(count > 0 ? `Sent to ${count.toLocaleString()} users` : 'Broadcast queued');
      setTitle('');
      setMessage('');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Send failed'),
  });

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>Notifications</h2>

      <div style={styles.twoCol}>
        {/* Compose */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Send Push Notification</h3>

          <label style={styles.label}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New scam alert in Chennai"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Body of the push notification..."
              rows={5}
              style={styles.textarea}
            />
          </label>

          <div style={styles.label}>
            <span>Target Audience</span>
            <div style={styles.segmented}>
              {(['all', 'verified', 'premium'] as Target[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    ...styles.segment,
                    background: target === t ? THEME.colors.primary : THEME.colors.white,
                    color: target === t ? THEME.colors.white : THEME.colors.text,
                  }}
                >
                  {targetLabel[t]}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.preview}>
            <div style={styles.previewHeader}>
              <span style={styles.previewApp}>SAFERCALLER</span>
              <span style={styles.previewTime}>now</span>
            </div>
            <div style={styles.previewTitle}>{title || 'Notification title'}</div>
            <div style={styles.previewBody}>{message || 'Notification message preview will appear here.'}</div>
          </div>

          <button
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending}
            style={styles.sendBtn}
          >
            {sendMut.isPending ? 'Sending…' : 'Send Notification'}
          </button>
        </section>

        {/* History */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Notifications</h3>
          {isLoading ? (
            <TableSkeleton rows={4} cols={1} />
          ) : history.length === 0 ? (
            <div style={styles.empty}>No notifications sent yet.</div>
          ) : (
            <ul style={styles.historyList}>
              {history.map((n, i) => (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                  style={styles.historyRow}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.historyTitle}>{n.title ?? '—'}</div>
                    <div style={styles.historyMessage}>{n.message ?? ''}</div>
                    <div style={styles.historyMeta}>
                      <Badge tone="primary">{targetLabel[(n.target ?? 'all') as Target]}</Badge>
                      <span style={{ color: THEME.colors.muted, fontSize: 11 }}>
                        {n.sentAt?.toDate?.()?.toLocaleString?.() ?? '—'}
                      </span>
                      {typeof n.deliveryCount === 'number' && (
                        <span style={{ color: THEME.colors.muted, fontSize: 11 }}>
                          · {n.deliveryCount.toLocaleString()} delivered
                        </span>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const MOCK_HISTORY: NotificationDoc[] = [
  { id: 'n1', title: 'UPI fraud spike detected', message: 'Be cautious of unknown UPI requests today.', target: 'all', deliveryCount: 14820, sentAt: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) } as any },
  { id: 'n2', title: 'Welcome to SAFERCALLER', message: 'Get started by verifying your profile.', target: 'all', deliveryCount: 9320, sentAt: { toDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000) } as any },
];

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: {
    background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`,
    borderRadius: 18, padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: 600, margin: 0 },
  label: {
    display: 'flex', flexDirection: 'column', gap: 6,
    fontSize: 12, color: THEME.colors.muted,
  },
  input: {
    height: 48, borderRadius: 12,
    border: `1px solid ${THEME.colors.border}`,
    padding: '0 14px', fontSize: 14, color: THEME.colors.text,
  },
  textarea: {
    minHeight: 100, borderRadius: 12,
    border: `1px solid ${THEME.colors.border}`,
    padding: '12px 14px', fontSize: 14, color: THEME.colors.text,
    fontFamily: 'inherit', resize: 'vertical',
  },
  segmented: {
    display: 'flex', gap: 4, padding: 4,
    background: THEME.colors.subtle, borderRadius: 35,
    marginTop: 6,
  },
  segment: {
    flex: 1, height: 36, borderRadius: 35,
    fontSize: 12, fontWeight: 500,
    transition: 'background 0.18s, color 0.18s',
  },

  preview: {
    background: THEME.colors.background,
    borderRadius: 12, padding: 16,
    border: `1px solid ${THEME.colors.subtle}`,
  },
  previewHeader: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11, color: THEME.colors.muted, marginBottom: 4,
  },
  previewApp: { fontWeight: 600, letterSpacing: 0.4 },
  previewTime: {},
  previewTitle: { fontSize: 14, fontWeight: 600, marginTop: 2 },
  previewBody: { fontSize: 13, color: THEME.colors.text, marginTop: 4, lineHeight: 1.5 },

  sendBtn: {
    background: THEME.colors.primary, color: THEME.colors.white,
    height: 48, borderRadius: 35, fontSize: 14, fontWeight: 600,
    marginTop: 8,
  },

  historyList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  historyRow: {
    display: 'flex', gap: 12,
    padding: 14, borderRadius: 12,
    background: THEME.colors.background,
    border: `1px solid ${THEME.colors.subtle}`,
  },
  historyTitle: { fontSize: 14, fontWeight: 600 },
  historyMessage: {
    fontSize: 13, color: THEME.colors.muted, marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  historyMeta: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap',
  },
  empty: { padding: 32, textAlign: 'center', color: THEME.colors.muted, fontSize: 13 },
};
