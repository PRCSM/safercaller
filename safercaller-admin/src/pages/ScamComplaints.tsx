import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { db, functions, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

type ScamReport = {
  id: string;
  reportedBy?: string;
  reporterName?: string;
  scammerName?: string;
  scammerPhone?: string;
  scammerUid?: string;
  email?: string;
  category?: string;
  description?: string;
  proofUrls?: string[];
  status?: 'open' | 'reviewing' | 'resolved';
  reputationScore?: number;
  complaintCount?: number;
  createdAt?: Timestamp;
  resolveNote?: string;
};

const STATUS_OPTIONS = ['all', 'open', 'reviewing', 'resolved'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const CATEGORIES = ['all', 'UPI Fraud', 'Fake Jobs', 'Phishing', 'Romance Scam', 'Investment Fraud', 'Cyber Fraud', 'fraud', 'scam', 'spam', 'other'];

async function fetchReports(): Promise<ScamReport[]> {
  if (IS_MOCK || !db) return MOCK_REPORTS;
  const snap = await getDocs(query(collection(db, 'scamReports'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

const statusTone = (s?: string) =>
  s === 'resolved' ? 'success' : s === 'reviewing' ? 'primary' : 'warning';

export default function ScamComplaints() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['scamReports'],
    queryFn: fetchReports,
  });

  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<ScamReport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const statusMut = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      if (IS_MOCK || !db) return;
      await updateDoc(doc(db, 'scamReports', id), { status: newStatus });
    },
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['scamReports'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (IS_MOCK || !db) return;
      await deleteDoc(doc(db, 'scamReports', id));
    },
    onSuccess: () => {
      toast.success('Report deleted');
      qc.invalidateQueries({ queryKey: ['scamReports'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  });

  const resolveMut = useMutation({
    mutationFn: async (r: ScamReport) => {
      if (IS_MOCK || !db) return;
      await updateDoc(doc(db, 'scamReports', r.id), { status: 'resolved' });
      if (r.scammerUid && functions) {
        const recompute = httpsCallable(functions, 'computeReputationScore');
        await recompute({ uid: r.scammerUid }).catch(() => {});
      }
    },
    onSuccess: () => {
      toast.success('Resolved — score recomputed');
      qc.invalidateQueries({ queryKey: ['scamReports'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Resolve failed'),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (category !== 'all' && r.category !== category) return false;
      if (!needle) return true;
      const hay = `${r.scammerName ?? ''} ${r.scammerPhone ?? ''} ${r.reporterName ?? ''} ${r.email ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [reports, status, category, search]);

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>
        Scam Complaints <span style={styles.count}>{filtered.length}</span>
      </h2>

      <div style={styles.controlsRow}>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} style={styles.select}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reporter, number, name..."
          style={styles.search}
        />
      </div>

      <div style={styles.tableCard}>
        {isLoading ? <TableSkeleton rows={8} cols={7} /> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Reporter</th>
                <th style={styles.th}>Scammer Number</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Complaints</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Proofs</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.02 }}
                  style={styles.tr}
                >
                  <td style={styles.td}><strong>{r.reporterName ?? r.reportedBy ?? '—'}</strong></td>
                  <td style={styles.td}>{r.scammerPhone ?? '—'}</td>
                  <td style={styles.td}>{r.category ?? '—'}</td>
                  <td style={styles.td}>{r.complaintCount ?? 1}</td>
                  <td style={styles.td}>{r.reputationScore ?? '—'}</td>
                  <td style={styles.td}><Badge tone={statusTone(r.status) as any}>{r.status ?? 'open'}</Badge></td>
                  <td style={styles.td}>{(r.proofUrls ?? []).length}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <button style={styles.reviewBtn} onClick={() => setReviewing(r)}>Review</button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={styles.empty}>No reports match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title="Scam Report Review"
        maxWidth={680}
      >
        {reviewing && (
          <ReviewModalContent
            report={reviewing}
            onUpdateStatus={(s) => statusMut.mutate({ id: reviewing.id, newStatus: s })}
            onResolve={() => { resolveMut.mutate(reviewing); setReviewing(null); }}
            onDelete={() => { setConfirmDelete(reviewing.id); setReviewing(null); }}
            onOpenProof={(url) => setLightbox(url)}
          />
        )}
      </Modal>

      <Modal open={!!lightbox} onClose={() => setLightbox(null)} maxWidth={900}>
        {lightbox && <img src={lightbox} alt="Proof" style={{ width: '100%', borderRadius: 12 }} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete report?"
        message="This permanently removes the scam report and its proof URLs from Firestore. Cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ReviewModalContent({
  report, onUpdateStatus, onResolve, onDelete, onOpenProof,
}: {
  report: ScamReport;
  onUpdateStatus: (status: string) => void;
  onResolve: () => void;
  onDelete: () => void;
  onOpenProof: (url: string) => void;
}) {
  const [statusDraft, setStatusDraft] = useState(report.status ?? 'open');
  const createdAt = report.createdAt?.toDate?.()?.toLocaleString?.() ?? '—';
  const proofs = report.proofUrls ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={modalStyles.grid}>
        <Field label="Scammer name"  value={report.scammerName} />
        <Field label="Phone"         value={report.scammerPhone} />
        <Field label="Email"         value={report.email} />
        <Field label="Category"      value={report.category} />
        <Field label="Reporter"      value={report.reporterName ?? report.reportedBy} />
        <Field label="Filed"         value={createdAt} />
        <Field label="Score"         value={String(report.reputationScore ?? '—')} />
        <Field label="Complaints"    value={String(report.complaintCount ?? 1)} />
      </div>

      <div>
        <div style={modalStyles.label}>Description</div>
        <div style={modalStyles.description}>
          {report.description ?? 'No description provided.'}
        </div>
      </div>

      {report.resolveNote && (
        <div>
          <div style={modalStyles.label}>Scammer's response</div>
          <div style={modalStyles.description}>{report.resolveNote}</div>
        </div>
      )}

      {proofs.length > 0 && (
        <div>
          <div style={modalStyles.label}>Evidence ({proofs.length})</div>
          <div style={modalStyles.proofGrid}>
            {proofs.map((url, i) => (
              <button key={url + i} style={modalStyles.proofThumb} onClick={() => onOpenProof(url)}>
                <img src={url} alt={`Proof ${i + 1}`} style={modalStyles.proofImg} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={modalStyles.actions}>
        <select
          value={statusDraft}
          onChange={(e) => setStatusDraft(e.target.value as any)}
          style={styles.select}
        >
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
        </select>
        <button onClick={() => onUpdateStatus(statusDraft)} style={modalStyles.updateBtn}>
          Update Status
        </button>
        <button onClick={onResolve} style={modalStyles.resolveBtn}>Resolve & Recompute</button>
        <button onClick={onDelete} style={modalStyles.deleteBtn}>Delete Report</button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={modalStyles.label}>{label}</div>
      <div style={modalStyles.fieldValue}>{value || '—'}</div>
    </div>
  );
}

const MOCK_REPORTS: ScamReport[] = [
  { id: 'r1', reporterName: 'Paikhomba K.', scammerPhone: '+91 99887 76655', category: 'UPI Fraud',     complaintCount: 12, reputationScore: 102, status: 'open',      description: 'Pretended to be from PhonePe support, asked for OTP.' },
  { id: 'r2', reporterName: 'Meena Devi',   scammerPhone: '+91 88776 65544', category: 'Fake Jobs',     complaintCount: 3,  reputationScore: 480, status: 'resolved' },
  { id: 'r3', reporterName: 'Rahul Kumar',  scammerPhone: '+91 77665 54433', category: 'Phishing',      complaintCount: 2,  reputationScore: 310, status: 'reviewing' },
  { id: 'r4', reporterName: 'Anonymous',    scammerPhone: '+91 66554 43322', category: 'Investment Fraud', complaintCount: 8,  reputationScore: 180, status: 'open' },
];

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  count: { fontSize: 13, color: THEME.colors.muted, fontWeight: 400 },
  controlsRow: { display: 'flex', gap: 12, alignItems: 'center' },
  search: {
    flex: 1, height: 44, borderRadius: 22, maxWidth: 360,
    border: `1px solid ${THEME.colors.border}`,
    padding: '0 16px', fontSize: 14,
  },
  select: {
    height: 40, borderRadius: 10, padding: '0 12px', fontSize: 13,
    border: `1px solid ${THEME.colors.border}`, background: THEME.colors.white,
  },
  tableCard: {
    background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`,
    borderRadius: 18, overflow: 'hidden',
  },
  table: { width: '100%' },
  th: {
    textAlign: 'left', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.5, color: THEME.colors.muted,
    padding: '12px 16px', borderBottom: `1px solid ${THEME.colors.subtle}`,
    background: THEME.colors.background,
  },
  tr: { borderBottom: `1px solid ${THEME.colors.subtle}` },
  td: { padding: '12px 16px', fontSize: 13, color: THEME.colors.text },
  empty: { padding: 48, textAlign: 'center', color: THEME.colors.muted, fontSize: 13 },
  reviewBtn: {
    background: THEME.colors.primary, color: THEME.colors.white,
    fontSize: 12, fontWeight: 500, height: 30, padding: '0 14px', borderRadius: 35,
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { fontSize: 11, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  fieldValue: { fontSize: 14, color: THEME.colors.text },
  description: {
    fontSize: 14, color: THEME.colors.text, lineHeight: 1.6,
    background: THEME.colors.background, padding: 14, borderRadius: 10,
    border: `1px solid ${THEME.colors.subtle}`,
  },
  proofGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  proofThumb: {
    width: '100%', aspectRatio: '1', borderRadius: 10,
    overflow: 'hidden', background: THEME.colors.subtle,
  },
  proofImg: { width: '100%', height: '100%', objectFit: 'cover' },
  actions: {
    display: 'flex', gap: 12, alignItems: 'center',
    paddingTop: 16, borderTop: `1px solid ${THEME.colors.subtle}`,
    flexWrap: 'wrap',
  },
  updateBtn: {
    background: THEME.colors.primary, color: THEME.colors.white,
    height: 38, padding: '0 16px', borderRadius: 35, fontSize: 13, fontWeight: 500,
  },
  resolveBtn: {
    background: THEME.colors.success, color: THEME.colors.white,
    height: 38, padding: '0 16px', borderRadius: 35, fontSize: 13, fontWeight: 500,
  },
  deleteBtn: {
    background: 'transparent', color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`,
    height: 38, padding: '0 16px', borderRadius: 35, fontSize: 13, fontWeight: 500,
    marginLeft: 'auto',
  },
};
