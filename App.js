import 'react-native-gesture-handler';
import { useCallback } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { MockBadge } from './src/components/common/MockBadge';
import { ToastContainer } from './src/components/common/Toast';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { useFonts } from './src/hooks/useFonts';

// Keep the native splash visible until fonts are ready. .catch handles
// the rare case where splash isn't shown (dev refresh, etc.).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts();

  // Hide splash after the root view mounts. Using onLayout instead of
  // useEffect prevents a one-frame flash of empty screen.
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ErrorBoundary>
        <MockBadge />
        <ToastContainer />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
