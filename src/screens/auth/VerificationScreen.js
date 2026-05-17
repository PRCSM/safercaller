import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
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
import { userService, authService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

const CARDS = [
  { id: 'liveness',   iconName: 'videocam-outline',     title: 'Liveness Video', sub: 'Record 10 seconds saying your name.' },
  { id: 'idProof',    iconName: 'card-outline',         title: 'ID Proof',       sub: 'Show government ID in camera.' },
  { id: 'thumbprint', iconName: 'finger-print-outline', title: 'Thumbprint',     sub: 'Biometric scan for login.' },
];

const LIVENESS_SECONDS = 10;

export default function VerificationScreen({ navigation, route }) {
  // The signed-in Firebase user lives in RNFirebase Auth — read it
  // directly rather than passing through nav params (which would warn
  // about non-serializable values).
  const user = authService.getCurrentUser();
  const profileData = route?.params?.profileData ?? null;

  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [statuses, setStatuses] = useState({ liveness: 'pending', idProof: 'pending', thumbprint: 'pending' });
  const [captures, setCaptures] = useState({ liveness: null, idProof: null, thumbprint: false });
  const [submitting, setSubmitting] = useState(false);
  const [livenessOpen, setLivenessOpen] = useState(false);

  const allDone = Object.values(statuses).every((s) => s === 'done');
  const cardRefs = useRef({});

  /* ─────────────────────────────  Per-card Start handlers  ───────────────────────────── */

  const onLivenessComplete = (uri) => {
    setCaptures((prev) => ({ ...prev, liveness: uri }));
    setStatuses((prev) => ({ ...prev, liveness: 'done' }));
    setLivenessOpen(false);
    haptics.success();
  };

  const onLivenessCancel = () => {
    setStatuses((prev) => ({ ...prev, liveness: 'pending' }));
    setLivenessOpen(false);
  };

  const startLiveness = () => {
    setStatuses((prev) => ({ ...prev, liveness: 'active' }));
    setLivenessOpen(true);
  };

  const startIdProof = async () => {
    setStatuses((prev) => ({ ...prev, idProof: 'active' }));
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast.warning('Camera permission required');
        setStatuses((prev) => ({ ...prev, idProof: 'pending' }));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], // FIX: MediaTypeOptions deprecated
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled) {
        setStatuses((prev) => ({ ...prev, idProof: 'pending' }));
        return;
      }
      setCaptures((prev) => ({ ...prev, idProof: result.assets[0].uri }));
      setStatuses((prev) => ({ ...prev, idProof: 'done' }));
      haptics.success();
    } catch (err) {
      toast.error('ID capture failed', err?.message ?? '');
      setStatuses((prev) => ({ ...prev, idProof: 'pending' }));
    }
  };

  const startThumbprint = async () => {
    setStatuses((prev) => ({ ...prev, thumbprint: 'active' }));
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
      if (!hasHardware || !enrolled) {
        // Simulator / device without biometrics → accept as done so the
        // demo flow doesn't dead-end. Real launch: surface this as an
        // error and block submission.
        toast.warning('Biometrics unavailable — accepted for demo');
        setCaptures((prev) => ({ ...prev, thumbprint: true }));
        setStatuses((prev) => ({ ...prev, thumbprint: 'done' }));
        haptics.success();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Scan to complete verification',
        fallbackLabel: 'Use device PIN',
      });
      if (result.success) {
        setCaptures((prev) => ({ ...prev, thumbprint: true }));
        setStatuses((prev) => ({ ...prev, thumbprint: 'done' }));
        haptics.success();
      } else {
        setStatuses((prev) => ({ ...prev, thumbprint: 'pending' }));
      }
    } catch (err) {
      toast.error('Biometric check failed', err?.message ?? '');
      setStatuses((prev) => ({ ...prev, thumbprint: 'pending' }));
    }
  };

  const startVerification = (id) => {
    if (statuses[id] !== 'pending') return;
    haptics.light();
    if (id === 'liveness') return startLiveness();
    if (id === 'idProof') return startIdProof();
    if (id === 'thumbprint') return startThumbprint();
  };

  /* ─────────────────────────────  Synced bounce when all done  ───────────────────────────── */

  useEffect(() => {
    if (!allDone) return;
    Object.values(cardRefs.current).forEach((bounce, i) => {
      if (typeof bounce === 'function') setTimeout(bounce, i * 80);
    });
  }, [allDone]);

  /* ─────────────────────────────  Final commit  ───────────────────────────── */

  const commitProfile = async (verified) => {
    setSubmitting(true);
    try {
      let profilePhotoUrl = null;
      // AUDIT FIX: photo upload is non-blocking — if it fails (network,
      // permissions, etc.), continue creating the profile without it.
      // The user can add a photo later via EditProfile.
      if (profileData?.photoUri && user?.uid) {
        try {
          profilePhotoUrl = await userService.uploadProfilePhoto(user.uid, profileData.photoUri);
        } catch (photoErr) {
          console.warn('[Verification] photo upload failed, continuing without it:', photoErr?.code);
          toast.warning('Photo upload failed', 'You can add it later from Settings.');
        }
      }
      // AUDIT FIX: ensure phone (with country code) is set on the profile
      // — userService.createUserProfile fills in defaults but we want the
      // authoritative phone to be the one from RNFirebase Auth.
      const payload = {
        ...(profileData ?? {}),
        phone: user?.phoneNumber ?? profileData?.phone ?? null,
        profilePhoto: profilePhotoUrl,
        verified,
      };
      delete payload.photoUri; // local-only; never persist
      const created = user?.uid
        ? await userService.createUserProfile(user.uid, payload)
        : payload;

      haptics.success();
      setProfile(created);
      if (user) setUser(user);
    } catch (err) {
      toast.error('Could not finish signup', err?.message ?? 'Try again');
      setSubmitting(false);
    }
  };

  const onDone = () =>
    commitProfile({ liveness: true, idProof: true, thumbprint: true });

  const onSkip = () =>
    commitProfile({ liveness: false, idProof: false, thumbprint: false });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <View style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#000" />
              </View>
            </Pressable>
          </View>

          <AppText variant="heading">{STRINGS.verification.title}</AppText>
          <AppText variant="caption" color={THEME.colors.muted}>
            {STRINGS.verification.subtitle}
          </AppText>

          <View style={styles.cardList}>
            {CARDS.map((card) => (
              <VerifyCard
                key={card.id}
                iconName={card.iconName}
                title={card.title}
                sub={card.sub}
                status={statuses[card.id]}
                onStart={() => startVerification(card.id)}
                registerBounce={(fn) => { cardRefs.current[card.id] = fn; }}
              />
            ))}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="lock-closed-outline" size={16} color="#5A585A" style={styles.infoIcon} />
            <AppText variant="caption" color={THEME.colors.muted} style={{ flex: 1 }}>
              {STRINGS.verification.encryptedNote}
            </AppText>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <DoneButton
            enabled={allDone && !submitting}
            loading={submitting}
            onPress={onDone}
          />
          <Pressable onPress={onSkip} style={styles.skipPress} hitSlop={8} disabled={submitting}>
            <AppText variant="label" color={THEME.colors.muted} style={styles.skipText}>
              {STRINGS.verification.skipForNow ?? 'Skip for now →'}
            </AppText>
          </Pressable>
        </View>
      </PageWrapper>

      <LivenessRecorderModal
        visible={livenessOpen}
        onComplete={onLivenessComplete}
        onCancel={onLivenessCancel}
      />
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Card  ───────────────────────────── */

function VerifyCard({ iconName, title, sub, status, onStart, registerBounce }) {
  const borderProgress = useSharedValue(0);     // 0=pending, 1=active, 2=done
  const checkScale = useSharedValue(0);
  const cardBounceScale = useSharedValue(1);
  const badgeOpacity = useSharedValue(1);

  const particles = Array.from({ length: 6 }).map(() => ({
    tx: useSharedValue(0),
    ty: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  }));

  useEffect(() => {
    if (status === 'active') {
      borderProgress.value = withTiming(1, { duration: 250 });
      badgeOpacity.value = withSequence(
        withTiming(0, { duration: 125 }),
        withTiming(1, { duration: 125 })
      );
    } else if (status === 'done') {
      borderProgress.value = withTiming(2, { duration: 250 });
      badgeOpacity.value = withSequence(
        withTiming(0, { duration: 125 }),
        withTiming(1, { duration: 125 })
      );
      checkScale.value = withSpring(1, { damping: 10, stiffness: 260 });
      particles.forEach((p, i) => {
        const angle = (i / particles.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 30 + Math.random() * 30;
        p.tx.value = 0;
        p.ty.value = 0;
        p.opacity.value = 1;
        p.scale.value = 0;
        p.scale.value = withTiming(1, { duration: 150 });
        p.tx.value = withTiming(Math.cos(angle) * dist, { duration: 600, easing: Easing.out(Easing.cubic) });
        p.ty.value = withTiming(Math.sin(angle) * dist, { duration: 600, easing: Easing.out(Easing.cubic) });
        p.opacity.value = withDelay(150, withTiming(0, { duration: 450 }));
      });
    } else {
      borderProgress.value = withTiming(0, { duration: 250 });
      checkScale.value = withTiming(0, { duration: 150 });
    }
  }, [status, borderProgress, checkScale, badgeOpacity, particles]);

  useEffect(() => {
    registerBounce(() => {
      cardBounceScale.value = withSequence(
        withSpring(1.02, { damping: 12, stiffness: 280 }),
        withSpring(1,    { damping: 14, stiffness: 220 })
      );
    });
  }, [registerBounce, cardBounceScale]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderProgress.value,
      [0, 1, 2],
      [THEME.colors.border, THEME.colors.primary, THEME.colors.success]
    ),
    transform: [{ scale: cardBounceScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

  const badgeLabel =
    status === 'pending' ? 'Pending' :
    status === 'active'  ? 'Verifying…' :
                            'Done';
  const badgeBg =
    status === 'pending' ? THEME.colors.warning :
    status === 'active'  ? THEME.colors.accentBlue :
                            THEME.colors.success;

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <Ionicons name={iconName} size={24} color="#5A585A" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" style={styles.cardTitle}>{title}</AppText>
          <AppText variant="caption" color={THEME.colors.muted} style={styles.cardSub}>{sub}</AppText>
        </View>
        {status === 'pending' ? (
          <Pressable onPress={onStart} style={styles.startButton}>
            <Ionicons name={iconName} size={14} color="#fff" style={{ marginRight: 4 }} />
            <AppText variant="caption" color={THEME.colors.white}>Start</AppText>
          </Pressable>
        ) : (
          <View style={styles.checkmarkWrap}>
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark-circle" size={26} color="#22C55E" />
            </Animated.View>
          </View>
        )}
      </View>
      <Animated.View style={[styles.badge, { backgroundColor: badgeBg }, badgeStyle]}>
        <AppText variant="caption">{badgeLabel}</AppText>
      </Animated.View>

      <View style={styles.particleAnchor} pointerEvents="none">
        {particles.map((p, i) => <Particle key={i} index={i} state={p} />)}
      </View>
    </Animated.View>
  );
}

const PARTICLE_COLORS = [THEME.colors.primary, THEME.colors.success, THEME.colors.warning];

function Particle({ index, state }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: state.tx.value },
      { translateY: state.ty.value },
      { scale: state.scale.value },
    ],
    opacity: state.opacity.value,
  }));
  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: PARTICLE_COLORS[index % PARTICLE_COLORS.length] },
        animStyle,
      ]}
    />
  );
}

/* ─────────────────────────────  Done button (with glow ring)  ───────────────────────────── */

function DoneButton({ enabled, loading, onPress }) {
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (enabled) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(0,   { duration: 800 })
        ),
        -1,
        false
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1,    { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
      glowOpacity.value = 0;
      glowScale.value = 1;
    }
  }, [enabled, glowOpacity, glowScale]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={styles.doneButtonWrap}>
      <Animated.View style={[styles.doneGlow, glowStyle]} pointerEvents="none" />
      <Button
        variant="primary"
        label="I'm Done"
        disabled={!enabled}
        loading={loading}
        onPress={onPress}
      />
    </View>
  );
}

/* ─────────────────────────────  Liveness modal (mocked countdown)  ───────────────────────────── */

function LivenessRecorderModal({ visible, onComplete, onCancel }) {
  const [count, setCount] = useState(LIVENESS_SECONDS);

  useEffect(() => {
    if (!visible) return undefined;
    setCount(LIVENESS_SECONDS);
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          // FIX: defer onComplete out of the setState updater. Calling a
          // parent-state-mutating callback synchronously inside `setCount`
          // produced "Cannot update a component (`VerificationScreen`)
          // while rendering a different component (`LivenessRecorderModal`)".
          // setTimeout 0 pushes it past the current render phase.
          setTimeout(() => onComplete('mock://liveness-video.mp4'), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, onComplete]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.livenessRoot}>
        <View style={styles.livenessHeader}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <AppText variant="label" color={THEME.colors.white}>Cancel</AppText>
          </Pressable>
        </View>
        <View style={styles.livenessCenter}>
          <View style={styles.livenessRing}>
            <AppText variant="display" color={THEME.colors.white}>{count}</AppText>
          </View>
          <AppText variant="label" color={THEME.colors.white} style={styles.livenessHint}>
            Look at the camera and say your name
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.6)" style={styles.livenessSub}>
            Recording {LIVENESS_SECONDS}s liveness video…
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  body: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.md,
  },
  topBar: { paddingBottom: THEME.spacing.sm },
  backButton: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardList: {
    marginTop: THEME.spacing.md,
    gap: 20,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 24,
    overflow: 'visible',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 13,
  },
  startButton: {
    flexDirection: 'row',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: THEME.colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  checkmarkWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  particleAnchor: {
    position: 'absolute',
    top: '50%',
    right: 40,
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  infoBox: {
    marginTop: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actions: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.lg,
    gap: THEME.spacing.sm,
  },
  doneButtonWrap: {
    position: 'relative',
  },
  doneGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.pill,
  },
  skipPress: {
    alignSelf: 'center',
    paddingVertical: THEME.spacing.sm,
  },
  skipText: {
    textDecorationLine: 'underline',
  },

  /* Liveness modal */
  livenessRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  livenessHeader: {
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  livenessCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  livenessRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: THEME.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livenessHint: {
    marginTop: THEME.spacing.lg,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  livenessSub: {
    textAlign: 'center',
  },
});
