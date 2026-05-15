import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { THEME } from '../lib/theme';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/users':           'Users',
  '/scam-complaints': 'Scam Complaints',
  '/listings':        'Listings',
  '/chat':            'Chat',
  '/notifications':   'Notifications',
  '/terms':           'Terms & Privacy',
  '/analytics':       'Analytics',
};

export default function Layout() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const title = PAGE_TITLES[location.pathname] ?? 'SAFERCALLER';
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={styles.shell}>
      <Sidebar />
      <main style={styles.main}>
        <header style={styles.header}>
          <h1 style={styles.title}>{title}</h1>
          <span style={styles.date}>{today}</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={styles.pageWrap}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: THEME.colors.background,
  },
  main: {
    marginLeft: 220,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px 16px',
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
  },
  date: {
    fontSize: 13,
    color: THEME.colors.muted,
  },
  pageWrap: {
    flex: 1,
  },
};
