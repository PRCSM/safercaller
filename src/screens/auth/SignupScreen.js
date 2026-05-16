import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { Button } from '../../components/common/Button';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { authService, userService } from '../../services';
import { toast } from '../../utils/toast';

const COUNTRY_CODE = '+91';

/**
 * Step 2 of the signup flow — phone (primary) + optional email.
 *
 *   • Phone field uses a custom styled TextInput with a hard-coded +91
 *     prefix (custom-built to avoid react-native-phone-number-input's
 *     React 19 / deprecated-deps issues). Swap in the library later if
 *     the country picker is needed.
 *   • Field stagger entrance: each block animates translateY 20→0 +
 *     opacity 0→1 with a 40 ms inter-stagger.
 *   • "Send OTP" press → userService.checkDuplicatePhone(phone) → if
 *     exists, toast.error and bail; else authService.signUpWithPhone(
 *     phone) → navigate to OTP with the verificationId + phone in
 *     params. Loading dots show on the button via Button's `loading`
 *     prop while the chained calls are in flight.
 */
// AUDIT FIX: Indian mobile regex — first digit must be 6-9, then 9 more digits.
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export default function SignupScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState(null); // AUDIT FIX: inline error state

  const digits = phone.trim().replace(/\D/g, '');
  const isPhoneValid = INDIAN_PHONE_REGEX.test(digits);

  const sendOTP = async () => {
    // AUDIT FIX: prevent double-tap.
    if (sending) return;
    // AUDIT FIX: strict Indian regex with inline error display (not toast).
    if (!isPhoneValid) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      haptics.error();
      return;
    }
    setPhoneError(null);
    setSending(true);
    const fullPhone = `${COUNTRY_CODE}${digits}`;
    try {
      const exists = await userService.checkDuplicatePhone(fullPhone);
      if (exists) {
        toast.error('This number is already registered', 'Sign in instead');
        haptics.error();
        return;
      }
      const verificationId = await authService.signUpWithPhone(fullPhone);
      haptics.success();
      navigation.navigate('OTP', { verificationId, phone: fullPhone });
    } catch (err) {
      toast.error('Could not send OTP', err?.message ?? 'Try again');
    } finally {
      setSending(false);
    }
  };

  const showComingSoon = (label) =>
    toast.info(`${label} sign-in coming soon`);

  const handleSignInLink = () => toast.info('Sign in flow coming soon');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Top bar */}
            <View style={styles.topBar}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
                <View style={styles.backButton}>
                  <Ionicons name="arrow-back" size={22} color="#000" />
                </View>
              </Pressable>
              <View style={styles.stepBadge}>
                <AppText variant="caption" color={THEME.colors.muted} style={styles.stepBadgeText}>
                  {STRINGS.signup.stepIndicator}
                </AppText>
              </View>
            </View>

            <StaggerBlock index={0}>
              <AppText variant="heading" style={styles.heading}>{STRINGS.signup.title}</AppText>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.subtitle}>
                {STRINGS.signup.subtitle}
              </AppText>
            </StaggerBlock>

            <StaggerBlock index={1} style={styles.fieldGroup}>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.label}>
                {STRINGS.signup.phoneLabel.toUpperCase()}
              </AppText>
              <View
                style={[
                  styles.phoneField,
                  phoneFocused && { borderColor: THEME.colors.focusCyan },
                ]}
              >
                <AppText variant="heading" color={THEME.colors.muted} style={styles.countryCode}>
                  {COUNTRY_CODE}
                </AppText>
                <View style={styles.phoneDivider} />
                <TextInput
                  value={phone}
                  onChangeText={(v) => { setPhone(v); if (phoneError) setPhoneError(null); }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder={STRINGS.signup.phonePlaceholder}
                  placeholderTextColor={THEME.colors.border}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  maxLength={10}
                />
              </View>
              {/* AUDIT FIX: inline error displayed below the field. */}
              {phoneError && (
                <AppText variant="caption" color={THEME.colors.coral} style={styles.inlineError}>
                  {phoneError}
                </AppText>
              )}
            </StaggerBlock>

            <StaggerBlock index={2} style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText variant="caption" color={THEME.colors.muted}>
                {STRINGS.common.or}
              </AppText>
              <View style={styles.dividerLine} />
            </StaggerBlock>

            <StaggerBlock index={3} style={styles.fieldGroup}>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.label}>
                {STRINGS.signup.emailLabel.toUpperCase()}
              </AppText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder={STRINGS.signup.emailPlaceholder}
                placeholderTextColor={THEME.colors.border}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.emailInput,
                  emailFocused && { borderColor: THEME.colors.focusCyan },
                ]}
              />
            </StaggerBlock>

            <StaggerBlock index={4} style={styles.socialRow}>
              <SocialButton label={STRINGS.signup.socialGoogle}   glyph="G"  onPress={() => showComingSoon('Google')} />
              <SocialButton label={STRINGS.signup.socialApple}    glyph=""  onPress={() => showComingSoon('Apple')} />
              <SocialButton label={STRINGS.signup.socialFacebook} glyph="f"  onPress={() => showComingSoon('Facebook')} />
            </StaggerBlock>

            <StaggerBlock index={5} style={styles.sendButtonWrap}>
              {/* AUDIT FIX: disable button while invalid OR sending. */}
              <Button
                variant="primary"
                label={STRINGS.signup.sendOtp}
                loading={sending}
                disabled={!isPhoneValid || sending}
                onPress={sendOTP}
              />
            </StaggerBlock>

            <StaggerBlock index={6} style={styles.signInRow}>
              <Pressable onPress={handleSignInLink}>
                <AppText variant="label" color={THEME.colors.muted}>
                  {STRINGS.signup.alreadyHaveAccount}
                </AppText>
              </Pressable>
            </StaggerBlock>
          </ScrollView>
        </KeyboardAvoidingView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Stagger wrapper  ───────────────────────────── */

function StaggerBlock({ index, children, style }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    ty.value = withDelay(
      index * 40,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      index * 40,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

/* ─────────────────────────────  Social button  ───────────────────────────── */

function SocialButton({ label, glyph, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`Sign up with ${label}`}>
      <View style={styles.socialButton}>
        <AppText variant="label">{glyph}</AppText>
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  subtitle: {
    marginTop: 4,
  },
  fieldGroup: {
    gap: THEME.spacing.sm,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  phoneField: {
    height: 88,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: THEME.colors.borderDark,
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCode: {
    fontSize: 25,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.colors.border,
  },
  phoneInput: {
    flex: 1,
    fontSize: 25,
    color: THEME.colors.text,
    paddingVertical: 0,
    letterSpacing: 1,
  },
  stepBadge: {
    backgroundColor: THEME.colors.subtle,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heading: {
    fontSize: 28,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },

  emailInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
    fontSize: 14,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.white,
  },

  socialRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    justifyContent: 'center',
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonWrap: {
    marginTop: THEME.spacing.md,
  },
  signInRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  // AUDIT FIX: inline phone error.
  inlineError: { marginTop: 6, fontSize: 12 },
});
