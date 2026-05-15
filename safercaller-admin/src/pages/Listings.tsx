import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection, getDocs, query, orderBy, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { db, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';
import Modal from '../components/Modal';
import Badge, { BadgeTone } from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

type Listing = {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  price?: number;
  priceUnit?: string;
  condition?: string;
  location?: string;
  sellerId?: string;
  sellerName?: string;
  mediaUrls?: string[];
  tags?: string[];
  status?: 'active' | 'expired' | 'deleted';
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
};

const TYPES = ['all', 'Service', 'Used', 'New', 'Refurbished'];
const STATUSES = ['all', 'active', 'expired', 'deleted'];
const CATEGORIES = ['all', 'Plumbing', 'Electrical', 'Tutoring', 'Vehicles', 'Electronics', 'Furniture'];

const PLACEHOLDER_COLORS = ['#A7CBF6', '#FFCAFC', '#FBE74E', '#9DC4F5', '#ECEFEC', '#FFE0A7'];

async function fetchListings(): Promise<Listing[]> {
  if (IS_MOCK || !db) return MOCK_LISTINGS;
  const snap = await getDocs(query(collection(db, 'listings'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

const statusTone = (s?: string): BadgeTone =>
  s === 'active' ? 'success' : s === 'deleted' ? 'danger' : 'muted';

const fmtDate = (ts?: Timestamp) =>
  ts?.toDate ? ts.toDate().toLocaleDateString() : '—';

const daysUntil = (ts?: Timestamp) => {
  if (!ts?.toDate) return null;
  const ms = ts.toDate().getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

export default function Listings() {
  const qc = useQueryClient();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings'],
    queryFn: fetchListings,
  });

  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Listing> }) => {
      if (IS_MOCK || !db) return;
      await updateDoc(doc(db, 'listings', id), patch as any);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listings'] }),
    onError: (e: any) => toast.error(e?.message ?? 'Update failed'),
  });

  const onDelete = (id: string) => {
    updateMut.mutate(
      { id, patch: { status: 'deleted' } },
      { onSuccess: () => toast.success('Listing deleted') }
    );
  };

  const onRelist = (id: string) => {
    const expires = Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    updateMut.mutate(
      { id, patch: { status: 'active', expiresAt: expires } },
      { onSuccess: () => toast.success('Listing re-listed') }
    );
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (status !== 'all' && l.status !== status) return false;
      if (type !== 'all' && l.type !== type) return false;
      if (category !== 'all' && l.category !== category) return false;
      if (!needle) return true;
      const hay = `${l.title ?? ''} ${l.sellerName ?? ''} ${l.location ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [listings, status, type, category, search]);

  const detail = detailId ? listings.find((l) => l.id === detailId) ?? null : null;

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>
        Listings <span style={styles.count}>{filtered.length}</span>
      </h2>

      <div style={styles.controlsRow}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
          {TYPES.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, seller, location..."
          style={styles.search}
        />
      </div>

      <div style={styles.tableCard}>
        {isLoading ? <TableSkeleton rows={8} cols={9} /> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Thumb</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Price</th>
                <th style={styles.th}>Seller</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Expires</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const days = daysUntil(l.expiresAt);
                const expiresSoon = days !== null && days < 7 && days >= 0 && l.status === 'active';
                return (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.02 }}
                    style={styles.tr}
                  >
                    <td style={styles.td}>
                      <div style={{
                        ...styles.thumb,
                        background: l.mediaUrls?.[0] ? undefined : PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
                      }}>
                        {l.mediaUrls?.[0] && <img src={l.mediaUrls[0]} alt="" style={styles.thumbImg} />}
                      </div>
                    </td>
                    <td style={styles.td}><strong>{l.title ?? '—'}</strong></td>
                    <td style={styles.td}>{l.type ?? '—'}</td>
                    <td style={styles.td}>{l.category ?? '—'}</td>
                    <td style={styles.td}>
                      {typeof l.price === 'number' ? `₹${l.price.toLocaleString('en-IN')}${l.priceUnit ?? ''}` : '—'}
                    </td>
                    <td style={styles.td}>{l.sellerName ?? '—'}</td>
                    <td style={styles.td}>{l.location ?? '—'}</td>
                    <td style={styles.td}><Badge tone={statusTone(l.status)}>{l.status ?? 'active'}</Badge></td>
                    <td style={{ ...styles.td, color: expiresSoon ? THEME.colors.coral : THEME.colors.text }}>
                      {fmtDate(l.expiresAt)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button style={styles.viewBtn} onClick={() => setDetailId(l.id)}>View</button>
                      {l.status === 'expired' && (
                        <button style={styles.relistBtn} onClick={() => onRelist(l.id)}>Re-list</button>
                      )}
                      {l.status !== 'deleted' && (
                        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(l.id)}>Delete</button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={styles.empty}>No listings match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.title ?? 'Listing'} maxWidth={720}>
        {detail && <ListingDetailContent listing={detail} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete listing?"
        message="The listing status will be set to 'deleted'. It will no longer appear in classifieds."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (confirmDelete) onDelete(confirmDelete); }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ListingDetailContent({ listing }: { listing: Listing }) {
  const media = listing.mediaUrls ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {media.length > 0 && (
        <div style={detailStyles.mediaGrid}>
          {media.map((url, i) => (
            <img key={url + i} src={url} alt={`Media ${i + 1}`} style={detailStyles.mediaImg} />
          ))}
        </div>
      )}

      <div style={detailStyles.grid}>
        <Field label="Price" value={typeof listing.price === 'number' ? `₹${listing.price.toLocaleString('en-IN')}${listing.priceUnit ?? ''}` : '—'} />
        <Field label="Type" value={listing.type} />
        <Field label="Category" value={listing.category} />
        <Field label="Condition" value={listing.condition} />
        <Field label="Location" value={listing.location} />
        <Field label="Status" value={listing.status} />
        <Field label="Created" value={fmtDate(listing.createdAt)} />
        <Field label="Expires" value={fmtDate(listing.expiresAt)} />
      </div>

      <div>
        <div style={detailStyles.label}>Description</div>
        <div style={detailStyles.description}>{listing.description ?? 'No description.'}</div>
      </div>

      {listing.tags && listing.tags.length > 0 && (
        <div>
          <div style={detailStyles.label}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {listing.tags.map((t) => <Badge key={t} tone="muted">{t}</Badge>)}
          </div>
        </div>
      )}

      <div style={detailStyles.sellerCard}>
        <div style={detailStyles.label}>Seller</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{listing.sellerName ?? '—'}</div>
        <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 2 }}>
          ID: <code>{listing.sellerId ?? '—'}</code>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={detailStyles.label}>{label}</div>
      <div style={detailStyles.fieldValue}>{value || '—'}</div>
    </div>
  );
}

const MOCK_LISTINGS: Listing[] = [
  { id: 'l1', title: 'AC Repair', type: 'Service', category: 'Electrical', price: 500, priceUnit: '/visit', sellerName: 'Rohit V.', location: 'Chennai', status: 'active', createdAt: { toDate: () => new Date(Date.now() - 3 * 86400000) } as any, expiresAt: { toDate: () => new Date(Date.now() + 360 * 86400000) } as any },
  { id: 'l2', title: 'iPhone 13 (used)', type: 'Used', category: 'Electronics', price: 32000, sellerName: 'Meena D.', location: 'Bangalore', status: 'active', condition: 'Good', createdAt: { toDate: () => new Date(Date.now() - 1 * 86400000) } as any, expiresAt: { toDate: () => new Date(Date.now() + 6 * 86400000) } as any },
  { id: 'l3', title: 'Math Tutoring', type: 'Service', category: 'Tutoring', price: 800, priceUnit: '/hour', sellerName: 'Susmita R.', location: 'Mumbai', status: 'expired', createdAt: { toDate: () => new Date(Date.now() - 60 * 86400000) } as any, expiresAt: { toDate: () => new Date(Date.now() - 1 * 86400000) } as any },
];

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  count: { fontSize: 13, color: THEME.colors.muted, fontWeight: 400 },
  controlsRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  search: { flex: 1, height: 44, borderRadius: 22, minWidth: 240, border: `1px solid ${THEME.colors.border}`, padding: '0 16px', fontSize: 14 },
  select: { height: 40, borderRadius: 10, padding: '0 12px', fontSize: 13, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.white },
  tableCard: { background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`, borderRadius: 18, overflow: 'hidden' },
  table: { width: '100%' },
  th: { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: THEME.colors.muted, padding: '12px 16px', borderBottom: `1px solid ${THEME.colors.subtle}`, background: THEME.colors.background },
  tr: { borderBottom: `1px solid ${THEME.colors.subtle}` },
  td: { padding: '12px 16px', fontSize: 13, color: THEME.colors.text, verticalAlign: 'middle' },
  empty: { padding: 48, textAlign: 'center', color: THEME.colors.muted, fontSize: 13 },
  thumb: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  viewBtn: { marginRight: 8, fontSize: 12, color: THEME.colors.primary, fontWeight: 500 },
  relistBtn: { marginRight: 8, fontSize: 12, color: THEME.colors.success, fontWeight: 500 },
  deleteBtn: { fontSize: 12, color: THEME.colors.coral, fontWeight: 500 },
};

const detailStyles: Record<string, React.CSSProperties> = {
  mediaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  mediaImg: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  label: { fontSize: 11, color: THEME.colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  fieldValue: { fontSize: 14, color: THEME.colors.text },
  description: { fontSize: 14, color: THEME.colors.text, lineHeight: 1.6, background: THEME.colors.background, padding: 14, borderRadius: 10, border: `1px solid ${THEME.colors.subtle}` },
  sellerCard: { background: THEME.colors.background, borderRadius: 12, padding: 14, border: `1px solid ${THEME.colors.subtle}` },
};
