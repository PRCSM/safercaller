import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { THEME } from '../lib/theme';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div style={styles.center}>
        <h2 style={styles.title}>Access denied</h2>
        <p style={styles.message}>
          Your account does not have admin privileges. Contact the project owner if
          you believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: THEME.colors.background,
    padding: 24,
    gap: 12,
  },
  spinner: {
    width: 40,
    height: 40,
    border: `3px solid ${THEME.colors.subtle}`,
    borderTopColor: THEME.colors.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  message: { fontSize: 14, color: THEME.colors.muted, maxWidth: 360, textAlign: 'center' },
};

// Spin keyframes live alongside the shimmer/fadeIn keyframes in styles.css.
// Adding here lazily so this component is self-contained if styles.css is missed.
if (typeof document !== 'undefined' && !document.getElementById('protected-route-spin')) {
  const style = document.createElement('style');
  style.id = 'protected-route-spin';
  style.innerHTML = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
