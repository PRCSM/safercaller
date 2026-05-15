import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import { TableSkeleton } from '../components/Skeleton';
import { db, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';

type AnalyticsData = {
  totals: { users: number; reports: number; listings: number; messages: number };
  trends: { users: number; reports: number; listings: number; messages: number };
  newUsersByDay: { date: string; count: number }[];
  scamByCategory: { name: string; count: number }[];
  listingsByCategory: { name: string; count: number }[];
  topFlagged: { phone: string; complaints: number; category: string }[];
};

const PIE_COLORS = ['#FF5A4D', '#FBE74E', '#0066FF', '#22C55E', '#9DC4F5', '#5A585A'];

async function fetchAnalytics(): Promise<AnalyticsData> {
  if (IS_MOCK || !db) return MOCK_DATA;

  const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 86400000));
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 86400000));

  const [usersSnap, reportsSnap, listingsSnap, recentUsersSnap, recentReportsSnap, recentListingsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'scamReports')),
    getDocs(query(collection(db, 'listings'), where('status', '==', 'active'))),
    getDocs(query(collection(db, 'users'), where('createdAt', '>=', sevenDaysAgo))),
    getDocs(query(collection(db, 'scamReports'), where('createdAt', '>=', sevenDaysAgo))),
    getDocs(query(collection(db, 'listings'), where('createdAt', '>=', sevenDaysAgo))),
  ]);

  // New users by day (last 30).
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    byDay.set(d.toISOString().split('T')[0], 0);
  }
  const allUsers = await getDocs(query(collection(db, 'users'), where('createdAt', '>=', thirtyDaysAgo)));
  for (const u of allUsers.docs) {
    const ts: Timestamp | undefined = u.data().createdAt;
    if (!ts?.toDate) continue;
    const key = ts.toDate().toISOString().split('T')[0];
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const newUsersByDay = Array.from(byDay.entries()).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  // Scam by category.
  const scamCat = new Map<string, number>();
  for (const d of reportsSnap.docs) {
    const cat = (d.data().category ?? 'other') as string;
    scamCat.set(cat, (scamCat.get(cat) ?? 0) + 1);
  }
  const scamByCategory = Array.from(scamCat.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Listings by category.
  const listCat = new Map<string, number>();
  for (const d of listingsSnap.docs) {
    const cat = (d.data().category ?? 'other') as string;
    listCat.set(cat, (listCat.get(cat) ?? 0) + 1);
  }
  const listingsByCategory = Array.from(listCat.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top flagged numbers.
  const phoneStats = new Map<string, { complaints: number; category: string }>();
  for (const d of reportsSnap.docs) {
    const data = d.data();
    const phone = data.scammerPhone as string | undefined;
    if (!phone) continue;
    const entry = phoneStats.get(phone) ?? { complaints: 0, category: data.category ?? '—' };
    entry.complaints++;
    phoneStats.set(phone, entry);
  }
  const topFlagged = Array.from(phoneStats.entries())
    .map(([phone, v]) => ({ phone, ...v }))
    .sort((a, b) => b.complaints - a.complaints)
    .slice(0, 10);

  return {
    totals: {
      users: usersSnap.size,
      reports: reportsSnap.size,
      listings: listingsSnap.size,
      messages: 0,
    },
    trends: {
      users: recentUsersSnap.size,
      reports: recentReportsSnap.size,
      listings: recentListingsSnap.size,
      messages: 0,
    },
    newUsersByDay,
    scamByCategory,
    listingsByCategory,
    topFlagged,
  };
}

const pct = (now: number, delta: number) => {
  if (now - delta <= 0) return delta > 0 ? '+100%' : '0%';
  const p = (delta / (now - delta)) * 100;
  return `${p >= 0 ? '↑' : '↓'} ${Math.abs(p).toFixed(1)}%`;
};

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: fetchAnalytics });

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total Users',     value: data.totals.users,    delta: pct(data.totals.users,    data.trends.users) },
      { label: 'Scam Reports',    value: data.totals.reports,  delta: pct(data.totals.reports,  data.trends.reports), tone: 'negative' as const },
      { label: 'Active Listings', value: data.totals.listings, delta: pct(data.totals.listings, data.trends.listings) },
      { label: 'Messages Sent',   value: data.totals.messages, delta: '—', tone: 'muted' as const },
    ];
  }, [data]);

  if (isLoading || !data) {
    return (
      <div style={styles.root}>
        <h2 style={styles.title}>Analytics</h2>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>Analytics</h2>

      <div style={styles.statRow}>
        {cards.map((c, i) => (
          <StatCard
            key={c.label}
            index={i}
            label={c.label}
            value={c.value}
            delta={c.delta}
            deltaTone={c.tone ?? 'positive'}
          />
        ))}
      </div>

      <div style={styles.row2}>
        <section style={{ ...styles.card, flex: 2 }}>
          <h3 style={styles.cardTitle}>New Users Over Time</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.newUsersByDay} margin={{ top: 16, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid stroke={THEME.colors.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={THEME.colors.muted} />
                <YAxis tick={{ fontSize: 10 }} stroke={THEME.colors.muted} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={THEME.colors.primary} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.cardTitle}>Scam Categories</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.scamByCategory}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.name} (${e.count})`}
                  labelLine={false}
                >
                  {data.scamByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div style={styles.row2}>
        <section style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.cardTitle}>Listings by Category</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.listingsByCategory} margin={{ top: 16, right: 16, bottom: 8, left: -8 }}>
                <CartesianGrid stroke={THEME.colors.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={THEME.colors.muted} />
                <YAxis tick={{ fontSize: 10 }} stroke={THEME.colors.muted} />
                <Tooltip />
                <Bar dataKey="count" fill={THEME.colors.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ ...styles.card, flex: 1 }}>
          <h3 style={styles.cardTitle}>Top Flagged Numbers</h3>
          <table style={{ width: '100%', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Complaints</th>
                <th style={styles.th}>Category</th>
              </tr>
            </thead>
            <tbody>
              {data.topFlagged.map((r) => (
                <tr key={r.phone} style={{ borderBottom: `1px solid ${THEME.colors.subtle}` }}>
                  <td style={styles.td}><strong>{r.phone}</strong></td>
                  <td style={styles.td}>{r.complaints}</td>
                  <td style={styles.td}>{r.category}</td>
                </tr>
              ))}
              {data.topFlagged.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, color: THEME.colors.muted, textAlign: 'center' }}>No flagged numbers yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

const MOCK_DATA: AnalyticsData = {
  totals: { users: 14820, reports: 3441, listings: 8207, messages: 28109 },
  trends: { users: 124, reports: 18, listings: 56, messages: 410 },
  newUsersByDay: Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(5, 10),
    count: 30 + Math.floor(Math.random() * 90),
  })),
  scamByCategory: [
    { name: 'UPI Fraud', count: 1240 },
    { name: 'Phishing', count: 720 },
    { name: 'Fake Jobs', count: 540 },
    { name: 'Romance Scam', count: 410 },
    { name: 'Investment Fraud', count: 320 },
    { name: 'Other', count: 211 },
  ],
  listingsByCategory: [
    { name: 'Electrical', count: 1820 },
    { name: 'Plumbing', count: 1410 },
    { name: 'Electronics', count: 1240 },
    { name: 'Tutoring', count: 920 },
    { name: 'Vehicles', count: 810 },
    { name: 'Furniture', count: 720 },
  ],
  topFlagged: [
    { phone: '+91 99887 76655', complaints: 12, category: 'UPI Fraud' },
    { phone: '+91 88776 65544', complaints: 9,  category: 'Fake Jobs' },
    { phone: '+91 77665 54433', complaints: 7,  category: 'Phishing' },
    { phone: '+91 66554 43322', complaints: 5,  category: 'Investment Fraud' },
  ],
};

const styles: Record<string, React.CSSProperties> = {
  root: { padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 26, fontWeight: 500, margin: 0 },
  statRow: { display: 'flex', gap: 16 },
  row2: { display: 'flex', gap: 20 },
  card: {
    background: THEME.colors.white, border: `1px solid ${THEME.colors.border}`,
    borderRadius: 18, padding: 24, minWidth: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 8 },
  th: {
    textAlign: 'left', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.5, color: THEME.colors.muted,
    padding: '8px 10px', borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  td: { padding: '10px', fontSize: 13, color: THEME.colors.text },
};
