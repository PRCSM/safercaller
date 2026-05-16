import { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Switch } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { scamService } from '../../services';
import { useDialerStore } from '../../store/dialerStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_DISMISS_THRESHOLD = 80;
const SWIPE_VELOCITY = 600;

const initialsFor = (name, phoneNumber) => {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
  if (phoneNumber) return 'UN';
  return '??';
};

/**
 * Incoming-call overlay. Reachable from:
 *   • DialerScreen call button when scamService.lookupNumber returns
 *     isFlagged === true (the safe path goes to Linking.openURL tel:).
 *   • The placeholder "Simulate Incoming Call" buttons in dev.
 *
 * Route params: { phoneNumber?, callerName?, reputationData? }
 *   - reputationData (from caller's lookup, optional) lets us skip the
 *     network round-trip; if absent, we re-lookup here.
 *
 * Three derived UI variants:
 *   flagged → coral avatar + alert card + bg red pulse
 *   safe    → blue avatar (caller is in our verified network)
 *   unknown → muted avatar (no record, no contact match)
 */
export default function IncomingCallScreen({ navigation, route }) {
  const phoneNumber = route?.params?.phoneNumber ?? route?.params?.number ?? '+91 99887 76655';
  const callerName = route?.params?.callerName ?? null;
  const passedLookup = route?.params?.lookup ?? route?.params?.reputationData ?? null;

  const receptionistMode = useDialerStore((s) => s.receptionistMode);
  const toggleReceptionist = useDialerStore((s) => s.toggleReceptionist);
  const addCallLog = useDialerStore((s) => s.addCallLog);
  const addBlockedNumber = useDialerStore((s) => s.addBlockedNumber);

  const [lookup, setLookup] = useState(passedLookup);
  const isFlagged = lookup?.isFlagged === true;
  const variant = isFlagged ? 'flagged' : (callerName ? 'safe' : 'unknown');

  useEffect(() => {
    if (passedLookup) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const result = await scamService.lookupNumber(phoneNumber);
        if (!cancelled) setLookup(result);
      } catch {
        if (!cancelled) setLookup({ isFlagged: false, count: 0, categories: [], score: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [phoneNumber, passedLookup]);

  /* ─────────────────  Shared values  ───────────────── */
  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const flagPulse = useSharedValue(0);
  const avatarPulseProgress = useSharedValue(0);

  const alertY = useSharedValue(20);
  const alertOpacity = useSharedValue(0);
  const borderPulse = useSharedValue(0.4);

  const blockY = useSharedValue(30);
  const blockOpacity = useSharedValue(0);
  const declineY = useSharedValue(30);
  const declineOpacity = useSharedValue(0);
  const answerY = useSharedValue(30);
  const answerOpacity = useSharedValue(0);

  // Mount choreography.
  useEffect(() => {
    sheetY.value = withSpring(0, { damping: 22, stiffness: 150 });
    haptics.medium();

    avatarPulseProgress.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );

    declineY.value       = withDelay(500, withSpring(0, { damping: 16, stiffness: 200 }));
    declineOpacity.value = withDelay(500, withTiming(1, { duration: 250 }));
    answerY.value        = withDelay(600, withSpring(0, { damping: 16, stiffness: 200 }));
    answerOpacity.value  = withDelay(600, withTiming(1, { duration: 250 }));
    blockY.value         = withDelay(700, withSpring(0, { damping: 16, stiffness: 200 }));
    blockOpacity.value   = withDelay(700, withTiming(1, { duration: 250 }));

    return () => {
      cancelAnimation(avatarPulseProgress);
      cancelAnimation(flagPulse);
      cancelAnimation(borderPulse);
    };
  }, []);

  // Flagged-only loops, triggered after lookup resolves.
  useEffect(() => {
    if (isFlagged) {
      flagPulse.value = withRepeat(
        withSequence(
          withTiming(0.08, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0,    { duration: 1000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      alertY.value      = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
      alertOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
      borderPulse.value = withRepeat(
        withSequence(
          withTiming(1,   { duration: 700 }),
          withTiming(0.4, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      flagPulse.value = withTiming(0, { duration: 300 });
      alertOpacity.value = 0;
      cancelAnimation(borderPulse);
    }
  }, [isFlagged]);

  /* ─────────────────  Action handlers  ───────────────── */

  const logCall = (action) => {
    addCallLog({
      id: `log-${Date.now()}`,
      number: phoneNumber,
      name: callerName ?? null,
      direction: 'inbound',
      status: action === 'block' ? 'flagged' : action === 'decline' ? 'missed' : 'safe',
      callerIdResult: variant,
      duration: 0,
      createdAt: new Date(),
    });
  };

  const dismiss = () => {
    sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
      if (finished) runOnJS(navigation.goBack)();
    });
  };

  const onBlock = () => {
    haptics.error();
    addBlockedNumber(phoneNumber);
    logCall('block');
    dismiss();
  };
  const onDecline = () => {
    haptics.error();
    logCall('decline');
    dismiss();
  };
  const onAnswer = () => {
    haptics.success();
    logCall('answer');
    dismiss();
  };

  /* ─────────────────  Swipe-down gesture  ───────────────── */

  const startY = useSharedValue(0);
  const pan = Gesture.Pan()
    .onStart(() => { startY.value = sheetY.value; })
    .onUpdate((e) => {
      if (e.translationY > 0) sheetY.value = startY.value + e.translationY;
    })
    .onEnd((e) => {
      const farEnough = e.translationY > SWIPE_DISMISS_THRESHOLD;
      const fastSwipe = e.velocityY > SWIPE_VELOCITY;
      if (farEnough || fastSwipe) {
        sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(haptics.error)();
            runOnJS(logCall)('decline');
            runOnJS(navigation.goBack)();
          }
        });
      } else {
        sheetY.value = withSpring(0, { damping: 22, stiffness: 150 });
      }
    });

  /* ─────────────────  Animated styles  ───────────────── */

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const flagOverlayStyle = useAnimatedStyle(() => ({ opacity: flagPulse.value }));
  const avatarRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + avatarPulseProgress.value * 0.4 }],
    opacity: 0.5 * (1 - avatarPulseProgress.value),
  }));
  const alertStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: alertY.value }],
    opacity: alertOpacity.value,
  }));
  const borderStyle = useAnimatedStyle(() => ({ opacity: borderPulse.value }));
  const blockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: blockY.value }],
    opacity: blockOpacity.value,
  }));
  const declineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: declineY.value }],
    opacity: declineOpacity.value,
  }));
  const answerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: answerY.value }],
    opacity: answerOpacity.value,
  }));

  /* ─────────────────  Variant colors  ───────────────── */
  const avatarBg =
    variant === 'flagged' ? THEME.colors.coral :
    variant === 'safe'    ? THEME.colors.primary :
                            THEME.colors.muted;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <StatusBar style="light" />
        {isFlagged && (
          <Animated.View pointerEvents="none" style={[styles.flagOverlay, flagOverlayStyle]} />
        )}

        <AppText variant="caption" color={THEME.colors.muted} style={[styles.topLabel, styles.topLabelText]}>
          {STRINGS.incomingCall.incomingCall}
        </AppText>

        {/* Avatar with pulse ring */}
        <View style={styles.avatarWrap}>
          <Animated.View
            pointerEvents="none"
            style={[styles.avatarRing, { backgroundColor: avatarBg }, avatarRingStyle]}
          />
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <AppText variant="heading" color={THEME.colors.white} style={styles.initials}>
              {initialsFor(callerName, phoneNumber)}
            </AppText>
          </View>
        </View>

        <AppText variant="heading" color={THEME.colors.white} style={[styles.number, styles.numberText]}>
          {phoneNumber}
        </AppText>
        <AppText variant="caption" color={THEME.colors.muted}>
          {callerName ?? STRINGS.incomingCall.unknownCaller}
        </AppText>

        {isFlagged && (
          <Animated.View style={[styles.alert, alertStyle]}>
            <Animated.View style={[styles.alertBorder, borderStyle]} />
            <AppText variant="label" color={THEME.colors.coral}>
              FLAGGED — {lookup?.count ?? 0} scam reports
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.55)">
              {lookup?.categories?.length
                ? `Reported for ${lookup.categories.join(', ')} by multiple users.`
                : 'Multiple scam reports recorded.'}
            </AppText>
            <View style={styles.pillRow}>
              <View style={styles.statPill}>
                <AppText variant="caption" color={THEME.colors.white}>
                  {lookup?.count ?? 0} complaints
                </AppText>
              </View>
              <View style={styles.statPill}>
                <AppText variant="caption" color={THEME.colors.white}>
                  Score: {lookup?.score ?? 0} / 1000
                </AppText>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.receptionistRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color={THEME.colors.white}>
              {STRINGS.incomingCall.aiReceptionist}
            </AppText>
            <AppText variant="caption" color={THEME.colors.muted}>
              {STRINGS.incomingCall.aiReceptionistSub}
            </AppText>
          </View>
          <Switch
            value={receptionistMode}
            onValueChange={() => { haptics.light(); toggleReceptionist(); }}
            trackColor={{ true: THEME.colors.primary, false: 'rgba(255,255,255,0.2)' }}
            thumbColor={THEME.colors.white}
          />
        </View>

        <View style={styles.actionRow}>
          <Animated.View style={blockStyle}>
            <ActionButton
              label={STRINGS.incomingCall.block}
              bg="rgba(255,90,77,0.2)"
              borderColor={THEME.colors.coral}
              iconName="ban-outline"
              onPress={onBlock}
            />
          </Animated.View>
          <Animated.View style={declineStyle}>
            <ActionButton
              label={STRINGS.incomingCall.decline}
              bg={THEME.colors.coral}
              iconName="close"
              big
              onPress={onDecline}
            />
          </Animated.View>
          <Animated.View style={answerStyle}>
            <ActionButton
              label={STRINGS.incomingCall.answer}
              bg={THEME.colors.primary}
              iconName="call"
              big
              onPress={onAnswer}
            />
          </Animated.View>
        </View>

        <AppText variant="caption" color="rgba(255,255,255,0.35)" style={styles.hint}>
          {STRINGS.incomingCall.gestureHint}
        </AppText>
      </Animated.View>
    </GestureDetector>
  );
}

/* ─────────────────────────────  Action button  ───────────────────────────── */

function ActionButton({ label, bg, borderColor, iconName, big, onPress }) {
  const scale = useSharedValue(1);
  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 320 });
        haptics.light();
      }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      onPress={onPress}
      style={{ alignItems: 'center' }}
    >
      <Animated.View
        style={[
          big ? styles.bigCircle : styles.smallCircle,
          { backgroundColor: bg, borderColor: borderColor ?? bg },
          useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] })),
        ]}
      >
        <Ionicons name={iconName} size={big ? 30 : 24} color="#fff" />
      </Animated.View>
      <AppText variant="caption" color={THEME.colors.white} style={{ marginTop: 6 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: THEME.colors.dark,
    paddingTop: 80,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  flagOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.coral,
  },
  topLabel: { marginBottom: THEME.spacing.md },
  topLabelText: {
    fontSize: 12,
    letterSpacing: 3,
  },

  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 104,
    height: 104,
  },
  avatarRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 28,
    fontWeight: '600',
  },
  initials: {
    fontSize: 32,
    fontWeight: '600',
  },

  number: { marginTop: THEME.spacing.md },

  alert: {
    width: '100%',
    backgroundColor: 'rgba(255,90,77,0.15)',
    borderRadius: 12,
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.lg,
    gap: 6,
    overflow: 'hidden',
  },
  alertBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME.colors.coral,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  receptionistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: THEME.spacing.md,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: THEME.spacing.xl,
    gap: 28,
  },
  bigCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: THEME.spacing.xl,
    marginBottom: 40,
  },
});
