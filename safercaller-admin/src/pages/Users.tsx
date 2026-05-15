import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, query, orderBy, limit, doc, updateDoc, deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { db, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import { TableSkeleton } from '../components/Skeleton';

type UserDoc = {
  uid: string;
  name?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  location?: string;
  profession?: string;
  profilePhoto?: string;
  reputationScore?: number;
  status?: 'active' | 'suspended';
  goOnline?: boolean;
  verified?: { liveness?: boolean; idProof?: boolean; thumbprint?: boolean };
  admin?: boolean;
  createdAt?: Timestamp;
};

type StatusFilter = 'all' | 'verified' | 'unverified' | 'suspended';
const PAGE_SIZE = 20;

async function fetchUsers(): Promise<UserDoc[]> {
  if (IS_MOCK || !db) return MOCK_USERS;
  const snap = await getDocs(
    query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500))
  );
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
}

const initialsFor = (name?: string) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const scoreTone = (s: number) =>
  s >= 600 ? 'primary' : s >= 300 ? 'warning' : 'danger';

export default function Users() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [drawerUid, setDrawerUid] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const suspendMut = useMutation({
    mutationFn: async ({ uid, suspend }: { uid: string; suspend: boolean }) => {
      if (IS_MOCK || !db) return;
      await updateDoc(doc(db, 'users', uid), { status: suspend ? 'suspended' : 'active' });
    },
    onSuccess: (_d, v) => {
      toast.success(v.suspend ? 'User suspended' : 'User reactivated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: async (uid: string) => {
      if (IS_MOCK || !db) return;
      await deleteDoc(doc(db, 'users', uid));
    },
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Delete failed'),
  });

  const scoreMut = useMutation({
    mutationFn: async ({ uid, score }: { uid: string; score: number }) => {
      if (IS_MOCK || !db) return;
      await updateDoc(doc(db, 'users', uid), { reputationScore: score });
    },
    onSuccess: () => {
      toast.success('Score updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const adminMut = useMutation({
    mutationFn: async ({ uid, admin }: { uid: string; admin: boolean }) => {
      if (IS_MOCK || !db) return;
      // Custom claims must be granted server-side. We flag the doc here as
      // a pending request — a Cloud Function (out of Phase 8 scope) would
      // pick this up and call `auth.setCustomUserClaims`.
      await updateDoc(doc(db, 'users', uid), { adminRequested: admin });
    },
    onSuccess: (_d, v) => toast.info(v.admin ? 'Admin grant queued' : 'Admin revoke queued'),
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'verified' && !u.verified?.idProof) return false;
      if (filter === 'unverified' && u.verified?.idProof) return false;
      if (filter === 'suspended' && u.status !== 'suspended') return false;
      if (!needle) return true;
      const hay = `${u.name ?? u.fullName ?? ''} ${u.phone ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const drawerUser = drawerUid ? users.find((u) => u.uid === drawerUid) ?? null : null;

  const exportCsv = () => {
    const headers = ['Name', 'Phone', 'Email', 'Location', 'Profession', 'Score', 'Status'];
    const rows = filtered.map((u) => [
      u.name ?? u.fullName ?? '',
      u.phone ?? '',
      u.email ?? '',
      u.location ?? '',
      u.profession ?? '',
      String(u.reputationScore ?? ''),
      u.status ?? 'active',
    ]);
    const csv = [headers, ...rows].map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.root}>
      <div style={styles.topRow}>
        <h2 style={styles.title}>
          Users <span style={styles.count}>{filtered.length}</span>
        </h2>
      </div>

      <div style={styles.controlsRow}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or phone..."
          style={styles.search}
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as StatusFilter); setPage(0); }}
          style={styles.select}
        >
          <option value="all">All</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={exportCsv} style={styles.ghostBtn}>Export CSV</button>
      </div>

      <div style={styles.tableCard}>
        {isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Profession</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Verified</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u, i) => {
                const score = u.reputationScore ?? 900;
                const name = u.name ?? u.fullName ?? '—';
                const suspended = u.status === 'suspended';
                return (
                  <motion.tr
                    key={u.uid}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.02 }}
                    style={styles.tr}
                  >
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.avatar}>
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt="" style={styles.avatarImg} />
                          ) : initialsFor(name)}
                        </div>
                        <span style={styles.userName}>{name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{u.phone ?? '—'}</td>
                    <td style={styles.td}>{u.location ?? '—'}</td>
                    <td style={styles.td}>{u.profession ?? '—'}</td>
                    <td style={styles.td}>
                      <Badge tone={scoreTone(score) as any}>{score}</Badge>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.verifyRow}>
                        {u.verified?.liveness   && <span title="Liveness">✓L</span>}
                        {u.verified?.idProof    && <span title="ID Proof">✓I</span>}
                        {u.verified?.thumbprint && <span title="Thumbprint">✓T</span>}
                        {!u.verified?.liveness && !u.verified?.idProof && !u.verified?.thumbprint && '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <Badge tone={suspended ? 'danger' : 'success'}>
                        {suspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button style={styles.viewBtn} onClick={() => setDrawerUid(u.uid)}>View</button>
                      <button
                        style={styles.suspendBtn}
                        onClick={() => suspendMut.mutate({ uid: u.uid, suspend: !suspended })}
                      >
                        {suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                      <button
                        style={styles.deleteBtn}
                        onClick={() => setConfirmDelete(u.uid)}
                        title="Delete"
                      >🗑</button>
                    </td>
                  </motion.tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr><td colSpan={8} style={styles.empty}>No users match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div style={styles.pager}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={styles.pagerBtn}
          >Previous</button>
          <span style={styles.pagerLabel}>Page {page + 1} of {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            style={styles.pagerBtn}
          >Next</button>
        </div>
      )}

      <Drawer
        open={!!drawerUser}
        onClose={() => setDrawerUid(null)}
        title="User Details"
        width={400}
      >
        {drawerUser && (
          <UserDrawerContent
            user={drawerUser}
            onScoreSave={(score) => scoreMut.mutate({ uid: drawerUser.uid, score })}
            onToggleAdmin={(admin) => adminMut.mutate({ uid: drawerUser.uid, admin })}
            onSuspend={() => {
              suspendMut.mutate({ uid: drawerUser.uid, suspend: drawerUser.status !== 'suspended' });
              setDrawerUid(null);
            }}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete user?"
        message="This permanently removes the user document. Their listings and reports remain. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/* ───── Drawer content ───── */

function UserDrawerContent({
  user, onScoreSave, onToggleAdmin, onSuspend,
}: {
  user: UserDoc;
  onScoreSave: (score: number) => void;
  onToggleAdmin: (admin: boolean) => void;
  onSuspend: () => void;
}) {
  const [score, setScore] = useState(String(user.reputationScore ?? 900));
  const [adminOn, setAdminOn] = useState(!!user.admin);
  const joined = user.createdAt?.toDate?.()?.toLocaleDateString?.() ?? '—';
  const name = user.name ?? user.fullName ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ ...styles.avatar, width: 56, height: 56, fontSize: 16 }}>
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="" style={styles.avatarImg} />
          ) : initialsFor(name)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: THEME.colors.muted }}>{user.phone ?? '—'}</div>
        </div>
      </div>

      <Row label="Email"      value={user.email} />
      <Row label="Location"   value={user.location} />
      <Row label="Profession" value={user.profession} />
      <Row label="Joined"     value={joined} />
      <Row label="Online"     value={user.goOnline === false ? 'No' : 'Yes'} />

      <div style={styles.drawerSection}>
        <label style={styles.drawerLabel}>Override Score</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            min={0}
            max={1000}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            style={{ ...styles.search, flex: 1, width: 'auto' }}
          />
          <button
            onClick={() => onScoreSave(Number(score))}
            style={styles.primaryBtn}
          >Save</button>
        </div>
      </div>

      <div style={styles.drawerSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={styles.drawerLabel}>Grant Admin</label>
          <button
            onClick={() => { const next = !adminOn; setAdminOn(next); onToggleAdmin(next); }}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: adminOn ? THEME.colors.primary : THEME.colors.border,
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 10, background: 'white',
              position: 'absolute', top: 2, left: adminOn ? 22 : 2, transition: 'left 0.2s',
            }} />
          </button>
        </div>
        <div style={{ fontSize: 11, color: THEME.colors.muted, marginTop: 4 }}>
          Sets adminRequested flag — actual claim is granted via Cloud Function.
        </div>
      </div>

      <button onClick={onSuspend} style={styles.suspendBigBtn}>
        {user.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={styles.drawerRow}>
      <span style={styles.drawerRowLabel}>{label}</span>
      <span style={styles.drawerRowValue}>{value ?? '—'}</span>
    </div>
  );
}

const MOCK_USERS: UserDoc[] = [
  { uid: 'u1', name: 'Paikhomba K.', phone: '+91 99887 76655', email: 'paikh@example.com', location: 'Chennai', profession: 'Software Engineer', reputationScore: 920, status: 'active', verified: { liveness: true, idProof: true } },
  { uid: 'u2', name: 'Meena Devi',   phone: '+91 88776 65544', location: 'Bangalore', profession: 'Doctor', reputationScore: 880, status: 'active', verified: { idProof: true } },
  { uid: 'u3', name: 'Rohit Verma',  phone: '+91 77665 54433', location: 'Mumbai', profession: 'Driver', reputationScore: 220, status: 'active', verified: {} },
  { uid: 'u4', name: 'Susmita R.',   phone: '+91 66554 43322', location: 'Delhi', profession: 'Teacher', reputationScore: 410, status: 'suspended', verified: {} },
];

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  topRow: { display: 'flex', alignItems: 'baseline', gap: 12 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  count: { fontSize: 13, color: THEME.colors.muted, fontWeight: 400 },

  controlsRow: { display: 'flex', gap: 12, alignItems: 'center' },
  search: {
    width: 320, height: 44, borderRadius: 22,
    border: `1px solid ${THEME.colors.border}`,
    padding: '0 16px', fontSize: 14,
  },
  select: {
    height: 40, borderRadius: 10, padding: '0 12px', fontSize: 13,
    border: `1px solid ${THEME.colors.border}`, background: THEME.colors.white,
  },
  ghostBtn: {
    marginLeft: 'auto', height: 38, padding: '0 16px', borderRadius: 35,
    border: `1px solid ${THEME.colors.border}`, fontSize: 13, fontWeight: 500,
    color: THEME.colors.text, background: THEME.colors.white,
  },

  tableCard: {
    background: THEME.colors.white,
    border: `1px solid ${THEME.colors.border}`,
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
  td: { padding: '12px 16px', fontSize: 13, color: THEME.colors.text, verticalAlign: 'middle' },
  empty: { padding: 48, textAlign: 'center', color: THEME.colors.muted, fontSize: 13 },

  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  userName: { fontWeight: 600 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, background: '#9DC4F5',
    color: THEME.colors.white, fontSize: 12, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },

  verifyRow: { display: 'inline-flex', gap: 6, fontSize: 11, color: THEME.colors.success, fontWeight: 600 },

  viewBtn: {
    marginRight: 8, fontSize: 12, color: THEME.colors.primary, fontWeight: 500,
  },
  suspendBtn: {
    background: 'rgba(255,90,77,0.1)', color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`, fontSize: 11, fontWeight: 500,
    height: 28, padding: '0 10px', borderRadius: 35, marginRight: 8,
  },
  deleteBtn: {
    fontSize: 13, color: THEME.colors.muted, padding: '0 6px',
  },

  pager: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingTop: 8,
  },
  pagerBtn: {
    padding: '0 14px', height: 36, borderRadius: 35,
    border: `1px solid ${THEME.colors.border}`, fontSize: 13,
    background: THEME.colors.white,
  },
  pagerLabel: { fontSize: 13, color: THEME.colors.muted },

  drawerRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingVertical: 4 } as React.CSSProperties,
  drawerRowLabel: { color: THEME.colors.muted },
  drawerRowValue: { color: THEME.colors.text, fontWeight: 500 },
  drawerSection: {
    background: THEME.colors.background,
    borderRadius: 12, padding: 14,
    border: `1px solid ${THEME.colors.subtle}`,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  drawerLabel: { fontSize: 11, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  primaryBtn: {
    background: THEME.colors.primary, color: THEME.colors.white,
    height: 38, padding: '0 16px', borderRadius: 35, fontSize: 13, fontWeight: 500,
  },
  suspendBigBtn: {
    background: 'rgba(255,90,77,0.1)', color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`, fontSize: 14, fontWeight: 500,
    height: 44, borderRadius: 35,
  },
};
