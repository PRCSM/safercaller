import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { authService } from '../../services';
import { toast } from '../../utils/toast';

const BOX_COUNT = 6;
const COUNTDOWN_SECONDS = 60;
const WRONG_DEMO_CODE = '000000'; // type this to demo the shake locally
// AUDIT FIX: after 3 wrong attempts, force user to request a new OTP.
const MAX_ATTEMPTS = 3;

/**
 * Step 2.5 — 6-digit OTP confirmation.
 *
 * Receives route.params: { verificationId, phone }
 *
 *   • 6 TextInput refs in a row. Typing a digit auto-advances focus to
 *     the next box; Backspace on an empty box pulls focus back.
 *   • Stagger entrance: each box translateX -15 → 0 + opacity 0 → 1
 *     with 50 ms delay between boxes.
 *   • Active (focused) box border swaps to #24A3E3.
 *   • Resend countdown ticks once per second; at 0 the "Resend OTP"
 *     link becomes pressable and resets the timer.
 *   • Verify submits via authService.verifyOTP(verificationId, code);
 *     on success the returned user is committed to authStore.setUser
 *     and we navigate to ProfileSetup. On failure (or the local demo
 *     code 000000) all boxes shake red and clear so the user can retry.
 */
export default function OTPScreen({ navigation, route }) {
  const { verificationId, phone } = route?.params ?? {};

  const inputRefs = useRef(Array.from({ length: BOX_COUNT }, () => null));
  const [digits, setDigits] = useState(Array(BOX_COUNT).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [status, setStatus] = useState('default'); // 'default' | 'verifying' | 'wrong' | 'correct'
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [attempts, setAttempts] = useState(0); // AUDIT FIX: track wrong attempts

  // Auto-focus first box.
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Countdown tick.
  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const code = digits.join('');

  const setBoxDigit = (i, value) => {
    const clean = value.replace(/\D/g, '');
    const next = [...digits];
    if (clean.length === 0) {
      next[i] = '';
      setDigits(next);
      return;
    }
    next[i] = clean.slice(-1);
    setDigits(next);
    if (next[i] && i < BOX_COUNT - 1) {
      inputRefs.current[i + 1]?.focus();
    } else if (i === BOX_COUNT - 1 && next.every((d) => d !== '')) {
      submit(next.join(''));
    }
    if (status !== 'default') setStatus('default');
  };

  const onKeyPress = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const submit = async (finalCode) => {
    setStatus('verifying');
    try {
      if (finalCode === WRONG_DEMO_CODE) {
        throw new Error('Incorrect OTP. Please try again.');
      }
      await authService.verifyOTP(finalCode);
      setStatus('correct');
      haptics.success();
      // The signed-in user is held by RNFirebase Auth (auth().currentUser).
      // setUser is deferred to VerificationScreen so the auth flow stays
      // inside AuthStack until identity is verified — see Option B in the
      // decisions log. Don't pass the Firebase user object through nav;
      // it has non-serializable methods and trips React Navigation.
      setTimeout(() => {
        navigation.navigate('ProfileSetup', { phone });
      }, 300);
    } catch (err) {
      // AUDIT FIX: count failed attempts; after 3, bounce back to Signup.
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setStatus('wrong');
      haptics.error();
      if (nextAttempts >= MAX_ATTEMPTS) {
        toast.error('Too many attempts', 'Request a new OTP.');
        setTimeout(() => navigation.popToTop(), 800);
        return;
      }
      toast.error(err?.message ?? 'Could not verify OTP');
      setTimeout(() => {
        setDigits(Array(BOX_COUNT).fill(''));
        setStatus('default');
        inputRefs.current[0]?.focus();
      }, 700);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    try {
      haptics.light();
      // signUpWithPhone refreshes the cached confirmation in authService —
      // verifyOTP picks up the new one automatically.
      await authService.signUpWithPhone(phone);
      setCountdown(COUNTDOWN_SECONDS);
      setAttempts(0); // AUDIT FIX: reset attempt counter on resend
      toast.success('OTP resent', `Sent to ${phone}`);
    } catch (err) {
      toast.error('Could not resend', err?.message ?? '');
    }
  };

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
              </View>
            </Pressable>
          </View>

          <View style={styles.body}>
            <AppText variant="display" style={styles.heading}>
              {STRINGS.otp.title}
            </AppText>

            <View style={styles.sentToRow}>
              <AppText variant="caption" color={THEME.colors.muted}>
                {STRINGS.otp.sentTo} {phone ?? '—'}
              </AppText>
              <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                <AppText variant="caption" color={THEME.colors.primary}>
                  {STRINGS.otp.change}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.boxRow}>
              {Array.from({ length: BOX_COUNT }).map((_, i) => (
                <OTPBox
                  key={i}
                  index={i}
                  refSetter={(r) => { inputRefs.current[i] = r; }}
                  value={digits[i]}
                  isFocused={focusedIndex === i}
                  status={status}
                  onChangeText={(v) => setBoxDigit(i, v)}
                  onKeyPress={(e) => onKeyPress(i, e)}
                  onFocusChange={(focused) => focused && setFocusedIndex(i)}
                />
              ))}
            </View>

            <Pressable onPress={resend} disabled={countdown > 0} hitSlop={8}>
              <AppText
                variant="caption"
                color={countdown > 0 ? THEME.colors.muted : THEME.colors.primary}
                style={styles.resend}
              >
                {countdown > 0
                  ? `${STRINGS.otp.resendIn} ${mm}:${ss}`
                  : 'Resend OTP'}
              </AppText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              label={STRINGS.otp.verify}
              loading={status === 'verifying'}
              showSuccess={status === 'correct'}
              disabled={code.length !== BOX_COUNT || status === 'verifying'}
              onPress={() => submit(code)}
            />
          </View>
        </KeyboardAvoidingView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Single box  ───────────────────────────── */

function OTPBox({ index, refSetter, value, isFocused, status, onChangeText, onKeyPress, onFocusChange }) {
  const entryX = useSharedValue(-15);
  const entryOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const bounceScale = useSharedValue(1);

  // Stagger entrance.
  useEffect(() => {
    entryX.value = withDelay(
      index * 50,
      withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) })
    );
    entryOpacity.value = withDelay(
      index * 50,
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
    );
  }, [index, entryX, entryOpacity]);

  // Bounce on digit landing.
  const lastFilled = useRef(false);
  useEffect(() => {
    const filled = value !== '';
    if (filled && !lastFilled.current) {
      bounceScale.value = withSequence(
        withTiming(1.08, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 12, stiffness: 280 })
      );
    }
    lastFilled.current = filled;
  }, [value, bounceScale]);

  // Shake on wrong.
  useEffect(() => {
    if (status === 'wrong') {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8,  { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(8,  { duration: 80 }),
        withTiming(0,  { duration: 80 })
      );
    } else {
      cancelAnimation(shakeX);
      shakeX.value = 0;
    }
  }, [status, shakeX]);

  // Scale bounce on correct.
  useEffect(() => {
    if (status === 'correct') {
      bounceScale.value = withSequence(
        withSpring(1.1, { damping: 10, stiffness: 260 }),
        withSpring(1,   { damping: 14, stiffness: 220 })
      );
    }
  }, [status, bounceScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: entryX.value + shakeX.value },
      { scale: bounceScale.value },
    ],
    opacity: entryOpacity.value,
  }));

  const borderColor =
    status === 'wrong'   ? THEME.colors.coral :
    status === 'correct' ? THEME.colors.success :
    isFocused            ? THEME.colors.focusCyan :
                           THEME.colors.dark;

  return (
    <Animated.View style={[styles.boxWrap, { borderColor }, animStyle]}>
      <TextInput
        ref={refSetter}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        keyboardType="number-pad"
        maxLength={1}
        style={styles.boxInput}
        selectionColor={THEME.colors.focusCyan}
      />
    </Animated.View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  topBar: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  backButton: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xl,
    gap: THEME.spacing.md,
  },
  heading: {
    fontSize: 52,
    lineHeight: 56,
  },
  sentToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: THEME.spacing.huge,
  },
  boxWrap: {
    width: 52,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '500',
    color: THEME.colors.text,
    padding: 0,
  },
  resend: {
    textAlign: 'center',
    marginTop: 24,
  },
  actions: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    marginTop: 40,
  },
});
