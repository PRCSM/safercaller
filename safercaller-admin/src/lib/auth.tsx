import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, IS_MOCK } from './firebase';

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthCtx = createContext<AuthState>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    // Mock mode: pretend a super-admin is signed in so the dashboard is usable
    // with seeded data even without a real auth flow.
    if (IS_MOCK || !auth) {
      setState({ user: { uid: 'mock-admin' } as User, isAdmin: true, loading: false });
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      try {
        const token = await u.getIdTokenResult();
        const isAdmin = token.claims?.admin === true;
        setState({ user: u, isAdmin, loading: false });
      } catch {
        setState({ user: u, isAdmin: false, loading: false });
      }
    });
    return unsub;
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
