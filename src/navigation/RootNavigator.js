import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AppText } from '../components/common/AppText';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import { useAuthStore } from '../store/authStore';
import { IS_MOCK } from '../constants/config';
import { mockUser, mockProfile } from '../services/mock/mockData';
import { THEME } from '../constants/theme';
import { fadeScale } from './transitions';

const ProfileSetupStack = createNativeStackNavigator();

/**
 * Top-level gate.
 *
 *   loading                            → spinner
 *   authenticated + profile complete   → AppStack
 *   authenticated + profile incomplete → ProfileSetup only
 *   not authenticated                  → AuthStack
 *
 * In mock mode the gate boots straight into AppStack: user/profile are
 * hydrated synchronously from mockData and `onAuthStateChanged` is never
 * subscribed (Firebase isn't initialized at all).
 */
export default function RootNavigator() {
  const { profile, isAuthenticated, isLoading, setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    if (IS_MOCK) {
      setUser(mockUser);
      setProfile(mockProfile);
      setLoading(false);
      return undefined;
    }

    const firebaseConfigured = !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    if (!firebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        setUser(fbUser);
        setProfile(snap.exists() ? snap.data() : null);
      } catch {
        setUser(fbUser);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [setUser, setProfile, setLoading]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <AppText variant="body" style={styles.loadingText}>SAFERCALLER</AppText>
      </View>
    );
  }

  if (isAuthenticated && !profile) {
    return (
      <ProfileSetupStack.Navigator screenOptions={{ headerShown: false, ...fadeScale }}>
        <ProfileSetupStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      </ProfileSetupStack.Navigator>
    );
  }

  if (isAuthenticated) return <AppStack />;
  return <AuthStack />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
    gap: THEME.spacing.lg,
  },
  loadingText: {
    letterSpacing: 1,
  },
});
