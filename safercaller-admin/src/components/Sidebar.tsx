import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { signOut } from 'firebase/auth';
import { auth, IS_MOCK } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { THEME } from '../lib/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

const LINKS = [
  { to: '/dashboard',       label: 'Dashboard' },
  { to: '/users',           label: 'Users' },
  { to: '/scam-complaints', label: 'Scam Complaints' },
  { to: '/listings',        label: 'Listings' },
  { to: '/chat',            label: 'Chat' },
  { to: '/notifications',   label: 'Notifications' },
  { to: '/terms',           label: 'Terms & Privacy' },
  { to: '/analytics',       label: 'Analytics' },
];

export default function Sidebar() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      if (!IS_MOCK && auth) await signOut(auth);
      toast.success('Signed out');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not sign out');
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandRow}>
        <span style={styles.brand}>SAFERCALLER</span>
        <span style={styles.adminBadge}>Admin</span>
      </div>

      <nav style={styles.nav}>
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : null),
            })}
          >
            {({ isActive }) => (
              <>
                <motion.span
                  layout={!reduced}
                  initial={false}
                  animate={{ scaleY: isActive ? 1 : 0 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 320, damping: 26 }
                  }
                  style={{ ...styles.activeBar, transformOrigin: 'top' }}
                />
                <span>{l.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottom}>
        <div style={styles.avatarRow}>
          <div style={styles.avatar} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.adminName} title={user?.email ?? undefined}>
              {user?.email ?? 'Super Admin'}
            </div>
            <button style={styles.signOut} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    height: '100vh',
    background: THEME.colors.dark,
    color: THEME.colors.white,
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '24px 20px 20px',
  },
  brand: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  adminBadge: {
    background: THEME.colors.primary,
    color: THEME.colors.white,
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 8,
  },
  link: {
    position: 'relative',
    display: 'block',
    padding: '12px 20px',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textDecoration: 'none',
    transition: 'color 0.15s, background 0.15s',
  },
  linkActive: {
    color: THEME.colors.white,
    background: 'rgba(255,255,255,0.05)',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: THEME.colors.primary,
  },
  bottom: {
    padding: 20,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: THEME.colors.subtle,
  },
  adminName: {
    fontSize: 11,
    color: THEME.colors.white,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOut: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
};
