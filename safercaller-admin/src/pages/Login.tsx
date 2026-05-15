import { FormEvent, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, IS_MOCK } from '../lib/firebase';
import { THEME } from '../lib/theme';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (IS_MOCK || !auth) {
      navigate(from, { replace: true });
      return;
    }

    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(
        err?.code === 'auth/invalid-credential' ||
          err?.code === 'auth/wrong-password' ||
          err?.code === 'auth/user-not-found'
          ? 'Invalid email or password.'
          : err?.message ?? 'Sign-in failed.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <span style={styles.brandText}>SAFERCALLER</span>
          <span style={styles.adminBadge}>Admin</span>
        </div>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Use your admin credentials to continue.</p>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@safercaller.app"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={busy} style={styles.submit}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: THEME.colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: THEME.colors.white,
    borderRadius: 24,
    padding: 48,
    maxWidth: 400,
    width: '100%',
    border: `1px solid ${THEME.colors.border}`,
    boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandText: { fontSize: 14, fontWeight: 600, letterSpacing: 0.4 },
  adminBadge: {
    background: THEME.colors.primary, color: THEME.colors.white,
    fontSize: 10, fontWeight: 600, padding: '2px 6px',
    borderRadius: 4, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: THEME.colors.muted, marginTop: 6, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: {
    display: 'flex', flexDirection: 'column', gap: 6,
    fontSize: 12, color: THEME.colors.muted,
  },
  input: {
    height: 44, borderRadius: 12,
    border: `1px solid ${THEME.colors.border}`,
    padding: '0 14px', fontSize: 14, color: THEME.colors.text,
  },
  error: {
    background: 'rgba(255,90,77,0.1)',
    color: THEME.colors.coral,
    border: `1px solid ${THEME.colors.coral}`,
    borderRadius: 8, padding: '10px 12px', fontSize: 13,
  },
  submit: {
    height: 48, borderRadius: 35,
    background: THEME.colors.primary,
    color: THEME.colors.white,
    fontSize: 14, fontWeight: 600,
    marginTop: 8,
  },
};
