import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import StatCard from '../components/StatCard';
import StatusPill, { Status } from '../components/StatusPill';
import { THEME } from '../lib/theme';
import { IS_MOCK, db } from '../lib/firebase';
import {
  mockHighRiskUsers,
  mockScamReports,
  mockStats,
  ScamRow,
  HighRiskUser,
} from '../lib/mockData';
import { useReducedMotion } from '../hooks/useReducedMotion';

type DashboardData = {
  stats: typeof mockStats;
  reports: ScamRow[];
  highRisk: HighRiskUser[];
};

async function fetchDashboard(): Promise<DashboardData> {
  if (IS_MOCK || !db) {
    await new Promise((r) => setTimeout(r, 250));
    return {
      stats: mockStats,
      reports: mockScamReports,
      highRisk: mockHighRiskUsers,
    };
  }
  try {
    const [usersSnap, reportsSnap, listingsSnap, resolvedSnap, recentReportsSnap, highRiskSnap] =
      await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'scamReports')),
        getDocs(query(collection(db, 'listings'), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'scamReports'), where('status', '==', 'resolved'))),
        getDocs(query(collection(db, 'scamReports'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'users'), orderBy('reputationScore', 'asc'), limit(4))),
      ]);

    const reports: ScamRow[] = recentReportsSnap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        reporter: x.reporterName ?? x.reportedBy ?? 'Anonymous',
        number: x.scammerPhone ?? '—',
        category: x.category ?? '—',
        complaints: x.complaintCount ?? 1,
        score: x.reputationScore ?? 0,
        status: (x.status ?? 'open') as ScamRow['status'],
      };
    });

    const highRisk: HighRiskUser[] = highRiskSnap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        name: x.name ?? x.fullName ?? 'Unknown',
        score: x.reputationScore ?? 0,
        complaints: x.reportCount ?? 0,
      };
    });

    return {
      stats: {
        totalUsers: usersSnap.size,
        totalUsersDelta: 0,
        scamReports: reportsSnap.size,
        scamReportsDelta: 0,
        activeListings: listingsSnap.size,
        activeListingsDelta: 0,
        resolved: resolvedSnap.size,
        resolvedRate: reportsSnap.size > 0
          ? Math.round((resolvedSnap.size / reportsSnap.size) * 100)
          : 0,
      },
      reports,
      highRisk,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Dashboard live fetch failed, falling back to mock:', err);
    return {
      stats: mockStats,
      reports: mockScamReports,
      highRisk: mockHighRiskUsers,
    };
  }
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { stats, reports, highRisk } = data;

  return (
    <div style={styles.root}>
      {/* 4-card stat row */}
      <div style={styles.statRow}>
        <StatCard index={0} label="Total Users"     value={stats.totalUsers}     delta={`+${stats.totalUsersDelta} today`} />
        <StatCard index={1} label="Scam Reports"    value={stats.scamReports}    delta={`+${stats.scamReportsDelta} today`} deltaTone="negative" />
        <StatCard index={2} label="Active Listings" value={stats.activeListings} delta={`+${stats.activeListingsDelta} today`} />
        <StatCard index={3} label="Resolved"        value={stats.resolved}       delta={`${stats.resolvedRate}% rate`} deltaTone="muted" />
      </div>

      {/* Two-column layout: reports table + high-risk users list */}
      <div style={styles.row}>
        <ScamReportsCard reports={reports} />
        <HighRiskCard users={highRisk} />
      </div>
    </div>
  );
}

/* ─────────────────────────────  Scam reports card  ───────────────────────────── */

function ScamReportsCard({ reports }: { reports: ScamRow[] }) {
  const reduced = useReducedMotion();
  return (
    <section style={{ ...styles.card, flex: 1.5 }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Scam Reports</h2>
        <button style={styles.ghostLink}>View all →</button>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Reporter</th>
            <th style={styles.th}>Number</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Complaints</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <motion.tr
              key={r.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: i * 0.03, ease: 'easeOut' }}
              style={styles.tr}
            >
              <td style={styles.td}><strong style={{ color: THEME.colors.text }}>{r.reporter}</strong></td>
              <td style={styles.td}>{r.number}</td>
              <td style={styles.td}>{r.category}</td>
              <td style={styles.td}>{r.complaints}</td>
              <td style={styles.td}>{r.score}</td>
              <td style={styles.td}><StatusPill status={r.status as Status} /></td>
              <td style={styles.td}>
                <button style={styles.reviewBtn}>Review</button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ─────────────────────────────  High-risk users card  ───────────────────────────── */

function HighRiskCard({ users }: { users: HighRiskUser[] }) {
  const reduced = useReducedMotion();
  return (
    <section style={{ ...styles.card, flex: 1 }}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>High Risk Users</h2>
      </div>
      <ul style={styles.userList}>
        {users.map((u, i) => (
          <motion.li
            key={u.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.03, ease: 'easeOut' }}
            style={styles.userRow}
          >
            <div style={styles.userAvatar}>
              {u.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.userName}>{u.name}</div>
              <div style={styles.userMeta}>{u.complaints} complaints</div>
            </div>
            <div style={styles.userScore}>{u.score}</div>
            <button style={styles.suspendBtn}>Suspend</button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────────  Skeleton  ───────────────────────────── */

function DashboardSkeleton() {
  return (
    <div style={styles.root}>
      <div style={styles.statRow}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...styles.card, height: 110 }} />
        ))}
      </div>
      <div style={styles.row}>
        <div style={{ ...styles.card, flex: 1.5, height: 360 }} />
        <div style={{ ...styles.card, flex: 1, height: 360 }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  root: {
    padding: '0 32px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  statRow: {
    display: 'flex',
    gap: 16,
  },
  row: {
    display: 'flex',
    gap: 20,
  },
  card: {
    background: THEME.colors.surface,
    borderRadius: 18,
    border: `1px solid ${THEME.colors.border}`,
    padding: 24,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  ghostLink: {
    fontSize: 12,
    color: THEME.colors.muted,
  },

  table: {
    width: '100%',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: THEME.colors.muted,
    padding: '10px 12px',
    borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  tr: {
    borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  td: {
    padding: '10px 12px',
    color: THEME.colors.muted,
    verticalAlign: 'middle',
  },
  reviewBtn: {
    background: THEME.colors.subtle,
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: 500,
    height: 28,
    padding: '0 10px',
    borderRadius: 35,
  },

  userList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    background: 'rgba(255,90,77,0.12)',
    color: THEME.colors.coral,
    fontSize: 11,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: THEME.colors.text,
  },
  userMeta: {
    fontSize: 12,
    color: THEME.colors.muted,
  },
  userScore: {
    background: 'rgba(255,90,77,0.12)',
    color: THEME.colors.coral,
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: 35,
  },
  suspendBtn: {
    background: 'rgba(255,90,77,0.1)',
    color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`,
    fontSize: 11,
    fontWeight: 500,
    height: 28,
    padding: '0 10px',
    borderRadius: 35,
  },
};
