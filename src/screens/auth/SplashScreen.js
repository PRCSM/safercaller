import { useEffect, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenNative from 'expo-splash-screen';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';

/**
 * Splash / Language Select — first screen of the AuthStack.
 *
 * Wraps in <PageWrapper> for the standard screen-level fade-up (300 ms
 * after a 50 ms delay). On top of that, the in-screen choreography
 * plays:
 *
 *     0 ms  → "SAFER"   opacity 0→1 + translateY 20→0      (400 ms)
 *   150 ms  → "CALLER"  same animation, staggered
 *   600 ms  → tagline   opacity 0→0.6 + translateY 10→0    (300 ms)
 *   900 ms  → blue line draws width 0 → 120 px from center (350 ms)
 *  1200 ms  → logo group translateY -60 + scale 0.85       (spring 18/120)
 *           + haptics.light()
 *  1600 ms  → language card + Continue translateY 80 → 0
 *             + opacity 0 → 1                              (400 ms)
 *  2200 ms  → SplashScreenNative.hideAsync() (defensive — App.js
 *             usually hides the native splash much earlier)
 *
 * Fonts: Tomato Grotesk is loaded once in App.js via useFonts. All text
 * in here flows through <AppText>, which sets fontFamily from THEME.
 */

const EASE_OUT = Easing.out(Easing.cubic);

export default function SplashScreen({ navigation }) {
  const [language] = useState('en'); // local — only English exists today

  // Shared values for the in-screen sequence.
  const saferOpacity   = useSharedValue(0);
  const saferY         = useSharedValue(20);
  const callerOpacity  = useSharedValue(0);
  const callerY        = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineY       = useSharedValue(10);
  const lineWidth      = useSharedValue(0);
  const logoY          = useSharedValue(0);
  const logoScale      = useSharedValue(1);
  const contentY       = useSharedValue(80);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    saferOpacity.value = withTiming(1, { duration: 400, easing: EASE_OUT });
    saferY.value       = withTiming(0, { duration: 400, easing: EASE_OUT });

    callerOpacity.value = withDelay(150, withTiming(1, { duration: 400, easing: EASE_OUT }));
    callerY.value       = withDelay(150, withTiming(0, { duration: 400, easing: EASE_OUT }));

    taglineOpacity.value = withDelay(600, withTiming(0.6, { duration: 300, easing: EASE_OUT }));
    taglineY.value       = withDelay(600, withTiming(0,   { duration: 300, easing: EASE_OUT }));

    lineWidth.value = withDelay(900, withTiming(120, { duration: 350, easing: EASE_OUT }));

    logoY.value     = withDelay(1200, withSpring(-60,  { damping: 18, stiffness: 120 }));
    logoScale.value = withDelay(1200, withSpring(0.85, { damping: 18, stiffness: 120 }));
    const hapticTimer = setTimeout(() => haptics.light(), 1200);

    contentY.value       = withDelay(1600, withTiming(0, { duration: 400, easing: EASE_OUT }));
    contentOpacity.value = withDelay(1600, withTiming(1, { duration: 400, easing: EASE_OUT }));

    const hideTimer = setTimeout(() => {
      SplashScreenNative.hideAsync().catch(() => {});
    }, 2200);

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(hideTimer);
    };
  }, [
    saferOpacity, saferY, callerOpacity, callerY,
    taglineOpacity, taglineY, lineWidth,
    logoY, logoScale, contentY, contentOpacity,
  ]);

  const saferStyle      = useAnimatedStyle(() => ({ opacity: saferOpacity.value,   transform: [{ translateY: saferY.value }] }));
  const callerStyle     = useAnimatedStyle(() => ({ opacity: callerOpacity.value,  transform: [{ translateY: callerY.value }] }));
  const taglineStyle    = useAnimatedStyle(() => ({ opacity: taglineOpacity.value, transform: [{ translateY: taglineY.value }] }));
  const lineStyle       = useAnimatedStyle(() => ({ width: lineWidth.value }));
  const logoGroupStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: logoY.value }, { scale: logoScale.value }] }));
  const contentStyle    = useAnimatedStyle(() => ({ opacity: contentOpacity.value, transform: [{ translateY: contentY.value }] }));

  const goToSignup = () => {
    haptics.light();
    navigation?.navigate?.('Signup');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <PageWrapper>
        <Animated.View style={[styles.logoGroup, logoGroupStyle]}>
          <View style={styles.wordmarkRow}>
            <Animated.View style={saferStyle}>
              <AppText variant="display" style={styles.wordmark}>{STRINGS.app.nameSplit.left}</AppText>
            </Animated.View>
            <Animated.View style={callerStyle}>
              <AppText variant="display" color={THEME.colors.primary} style={styles.wordmark}>
                {STRINGS.app.nameSplit.right}
              </AppText>
            </Animated.View>
          </View>

          <Animated.View style={taglineStyle}>
            <AppText variant="caption" color={THEME.colors.muted} style={styles.tagline}>
              {STRINGS.app.tagline}
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.line, lineStyle]} />
        </Animated.View>

        <Animated.View style={[styles.contentWrap, contentStyle]}>
          <View style={styles.languageCard}>
            <AppText variant="label">{STRINGS.splash.selectLanguage}</AppText>
            <Pressable disabled style={styles.langPill}>
              <AppText variant="label" color={THEME.colors.white}>
                {STRINGS.splash.english}
              </AppText>
            </Pressable>
            <AppText variant="caption" color={THEME.colors.muted} style={styles.langMore}>
              {STRINGS.splash.moreLanguages}
            </AppText>
          </View>

          <Button
            variant="primary"
            label={STRINGS.common.continue}
            onPress={goToSignup}
          />

          <AppText variant="caption" color={THEME.colors.muted} style={styles.note}>
            {STRINGS.splash.freshInstallNote}
          </AppText>
        </Animated.View>
      </PageWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.white,
  },
  logoGroup: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  wordmarkRow: {
    flexDirection: 'row',
  },
  wordmark: {
    fontSize: 52,
    lineHeight: 56,
  },
  tagline: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  line: {
    height: 2,
    backgroundColor: THEME.colors.primary,
    alignSelf: 'center',
    marginTop: THEME.spacing.xs,
  },
  contentWrap: {
    position: 'absolute',
    bottom: THEME.spacing.xxxl,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    gap: THEME.spacing.lg,
  },
  languageCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xxxl,
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.subtle,
  },
  langPill: {
    height: THEME.sizes.buttonHeight,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
  },
  langMore: {
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
  },
  note: {
    textAlign: 'center',
  },
});
