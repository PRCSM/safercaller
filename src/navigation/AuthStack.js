import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/auth/OnboardingScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import { THEME } from '../constants/theme';
import { fadeScale } from './transitions';

const Stack = createStackNavigator();

export default function AuthStack() {
  // Check AsyncStorage on mount: have we shown onboarding before?
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setInitialRoute(seen === 'true' ? 'Splash' : 'Onboarding');
      } catch {
        setInitialRoute('Splash');
      }
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, ...fadeScale }}
    >
      <Stack.Screen name="Onboarding"   component={OnboardingScreen} />
      <Stack.Screen name="Splash"       component={SplashScreen} />
      <Stack.Screen name="Signup"       component={SignupScreen} />
      <Stack.Screen name="OTP"          component={OTPScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
    </Stack.Navigator>
  );
}
