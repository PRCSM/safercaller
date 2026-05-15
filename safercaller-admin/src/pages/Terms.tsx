import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  doc, getDoc, setDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import { TableSkeleton } from '../components/Skeleton';

type LegalDoc = {
  termsOfService?: string;
  privacyPolicy?: string;
  termsUpdatedAt?: Timestamp;
  privacyUpdatedAt?: Timestamp;
};

type Tab = 'terms' | 'privacy';

async function fetchLegal(): Promise<LegalDoc> {
  if (IS_MOCK || !db) return MOCK_LEGAL;
  const snap = await getDoc(doc(db, 'config', 'legal'));
  return (snap.exists() ? snap.data() : {}) as LegalDoc;
}

export default function Terms() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['legal'], queryFn: fetchLegal });

  const [tab, setTab] = useState<Tab>('terms');
  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');

  useEffect(() => {
    if (data) {
      setTerms(data.termsOfService ?? '');
      setPrivacy(data.privacyPolicy ?? '');
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (which: Tab) => {
      if (IS_MOCK || !db) return;
      const patch = which === 'terms'
        ? { termsOfService: terms, termsUpdatedAt: serverTimestamp() }
        : { privacyPolicy: privacy, privacyUpdatedAt: serverTimestamp() };
      await setDoc(doc(db, 'config', 'legal'), patch, { merge: true });
    },
    onSuccess: () => {
      toast.success('Updated successfully');
      qc.invalidateQueries({ queryKey: ['legal'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  const fmtDate = (ts?: Timestamp) =>
    ts?.toDate ? ts.toDate().toLocaleString() : '—';

  const current = tab === 'terms' ? terms : privacy;
  const setCurrent = tab === 'terms' ? setTerms : setPrivacy;
  const lastUpdated = tab === 'terms' ? data?.termsUpdatedAt : data?.privacyUpdatedAt;

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>Terms & Privacy</h2>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab('terms')}
          style={{ ...styles.tab, ...(tab === 'terms' ? styles.tabActive : null) }}
        >Terms of Service</button>
        <button
          onClick={() => setTab('privacy')}
          style={{ ...styles.tab, ...(tab === 'privacy' ? styles.tabActive : null) }}
        >Privacy Policy</button>
      </div>

      <section style={styles.card}>
        {isLoading ? (
          <TableSkeleton rows={10} cols={1} />
        ) : (
          <>
            <textarea
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={`Enter ${tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'} content here…`}
              style={styles.textarea}
            />
            <div style={styles.footerRow}>
              <span style={styles.lastUpdated}>Last updated: {fmtDate(lastUpdated)}</span>
              <span style={styles.charCount}>{current.length.toLocaleString()} chars</span>
            </div>
            <div style={styles.actionsRow}>
              <button
                onClick={() => saveMut.mutate(tab)}
                disabled={saveMut.isPending}
                style={styles.saveBtn}
              >
                {saveMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const MOCK_LEGAL: LegalDoc = {
  termsOfService: '## SAFERCALLER Terms of Service\n\nBy using this app you agree to…\n\n(Lorem ipsum placeholder)',
  privacyPolicy: '## SAFERCALLER Privacy Policy\n\nWe collect the following data…\n\n(Lorem ipsum placeholder)',
};

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },

  tabs: {
    display: 'flex', gap: 4, padding: 4,
    background: THEME.colors.subtle, borderRadius: 35,
    alignSelf: 'flex-start',
  },
  tab: {
    height: 36, padding: '0 18px', borderRadius: 35,
    fontSize: 13, fontWeight: 500, color: THEME.colors.text,
  },
  tabActive: { background: THEME.colors.white, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },

  card: {
    background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`,
    borderRadius: 18, padding: 24,
    display: 'flex', flexDirection: 'column', gap: 12,
  },

  textarea: {
    width: '100%', height: 500, borderRadius: 12,
    border: `1px solid ${THEME.colors.border}`,
    padding: '12px 16px',
    fontSize: 14, lineHeight: 1.6,
    fontFamily: 'inherit', resize: 'vertical',
    color: THEME.colors.text,
  },

  footerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  lastUpdated: { fontSize: 12, color: THEME.colors.muted },
  charCount: { fontSize: 12, color: THEME.colors.muted },

  actionsRow: { display: 'flex', justifyContent: 'flex-end' },
  saveBtn: {
    background: THEME.colors.primary, color: THEME.colors.white,
    height: 44, padding: '0 24px', borderRadius: 35,
    fontSize: 14, fontWeight: 600,
  },
};
