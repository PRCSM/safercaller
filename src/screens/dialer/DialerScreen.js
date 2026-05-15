import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { getHours } from 'date-fns';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics, springs } from '../../constants/animations';
import { useAuthStore } from '../../store/authStore';
import { useDialerStore } from '../../store/dialerStore';
import { scamService } from '../../services';
import { toast } from '../../utils/toast';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];
const SUB_LABELS = {
  '2': 'ABC', '3': 'DEF',
  '4': 'GHI', '5': 'JKL', '6': 'MNO',
  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
  '0': '+',
};

const greetingFor = (hour) => {
  if (hour >= 5 && hour < 12) return STRINGS.dialer.greetingMorning;
  if (hour >= 12 && hour < 17) return STRINGS.dialer.greetingAfternoon;
  if (hour >= 17 && hour < 22) return STRINGS.dialer.greetingEvening;
  return STRINGS.dialer.greetingEvening;
};

export default function DialerScreen({ navigation }) {
  const profile = useAuthStore((s) => s.profile);
  const currentNumber = useDialerStore((s) => s.currentNumber);
  const callLogs = useDialerStore((s) => s.callLogs);
  const addDigit = useDialerStore((s) => s.addDigit);
  const deleteDigit = useDialerStore((s) => s.deleteDigit);
  const clearNumber = useDialerStore((s) => s.clearNumber);
  const addCallLog = useDialerStore((s) => s.addCallLog);

  const score = profile?.reputationScore ?? 0;
  const firstName = (profile?.name ?? '').split(' ')[0];
  const greeting = greetingFor(getHours(new Date()));
  const spamBlockedToday = callLogs.filter(
    (l) => l.status === 'flagged' || l.status === 'scamBlocked'
  ).length;

  const handleDigit = (digit) => addDigit(digit);
  const handleBackspace = () => deleteDigit();
  const handleBackspaceLong = () => {
    haptics.medium();
    clearNumber();
  };

  const handleCallPress = async () => {
    if (!currentNumber) return;
    try {
      const lookup = await scamService.lookupNumber(currentNumber);
      addCallLog({
        id: `log-${Date.now()}`,
        number: currentNumber,
        direction: 'outbound',
        status: lookup.isFlagged ? 'flagged' : 'safe',
        callerIdResult: lookup.isFlagged ? 'flagged' : 'safe',
        duration: 0,
        createdAt: new Date(),
      });
      if (lookup.isFlagged) {
        navigation.getParent()?.getParent()?.navigate('IncomingCall', { number: currentNumber, lookup })
          ?? navigation.navigate('IncomingCall', { number: currentNumber, lookup });
      } else {
        await Linking.openURL(`tel:${currentNumber}`).catch(() => {
          toast.warning('Cannot place call from this device', currentNumber);
        });
      }
    } catch (err) {
      toast.error('Lookup failed', err?.message ?? '');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <AppText variant="body" style={styles.brand}>{STRINGS.app.name}</AppText>
            <View style={styles.topActions}>
              <IconButton glyph="🔍" />
              <IconButton glyph="🔔" />
            </View>
          </View>

          {/* Greeting */}
          <View>
            <AppText variant="body">
              {greeting}{firstName ? `  ${firstName}` : ''}
            </AppText>
            <AppText variant="caption" color={THEME.colors.primary}>
              {spamBlockedToday > 0
                ? STRINGS.dialer.blockedToday(spamBlockedToday)
                : 'No spam blocked today'}
            </AppText>
          </View>

          {/* Trust score card */}
          <TrustScoreCard score={score} verified={profile?.verified} />

          {/* Number display */}
          <View style={styles.numberRow}>
            {currentNumber.length === 0 ? (
              <AppText variant="display" color={THEME.colors.border}>
                {STRINGS.dialer.numberPlaceholder}
              </AppText>
            ) : (
              currentNumber.split('').map((char, i) => (
                <Animated.View
                  key={`${i}`}
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(80)}
                >
                  <AppText variant="display">{char}</AppText>
                </Animated.View>
              ))
            )}
          </View>

          {/* Dial pad */}
          <View style={styles.dialPad}>
            {PAD_ROWS.map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((digit) => (
                  <DialKey
                    key={digit}
                    digit={digit}
                    sub={SUB_LABELS[digit]}
                    onPress={() => handleDigit(digit)}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Call button row */}
          <View style={styles.callRow}>
            <View style={styles.callPlaceholder} />
            <CallButton onPress={handleCallPress} />
            <BackspaceButton
              onPress={handleBackspace}
              onLongPress={handleBackspaceLong}
              disabled={currentNumber.length === 0}
            />
          </View>
        </ScrollView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Icon button (top bar)  ───────────────────────────── */

function IconButton({ glyph, onPress }) {
  const scale = useSharedValue(1);
  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
        haptics.light();
      }}
      onPressOut={() => { scale.value = withSpring(1, springs.default); }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.iconButton,
          useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] })),
        ]}
      >
        <AppText variant="label">{glyph}</AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Dial key  ───────────────────────────── */

function DialKey({ digit, sub, onPress }) {
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);
  const bgDarken = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
    bgDarken.value = withTiming(1, { duration: 100 });
    rippleScale.value = 0.5;
    rippleOpacity.value = 0.2;
    rippleScale.value = withTiming(1.6, { duration: 400, easing: Easing.out(Easing.cubic) });
    rippleOpacity.value = withTiming(0, { duration: 400 });
    haptics.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.default);
    bgDarken.value = withTiming(0, { duration: 150 });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgDarken.value > 0.5 ? THEME.colors.border : THEME.colors.surface,
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.keyHit}
    >
      <Animated.View style={[styles.key, buttonStyle]}>
        <Animated.View style={[styles.keyRipple, rippleStyle]} pointerEvents="none" />
        <AppText variant="heading">{digit}</AppText>
        {!!sub && (
          <AppText variant="caption" color={THEME.colors.muted} style={styles.keySub}>
            {sub}
          </AppText>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Call button (pulse ring)  ───────────────────────────── */

function CallButton({ onPress }) {
  const ringProgress = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    ringProgress.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );
    return () => cancelAnimation(ringProgress);
  }, [ringProgress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ringProgress.value * 0.3 }],
    opacity: 0.4 * (1 - ringProgress.value),
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        btnScale.value = withSpring(0.92, { damping: 15, stiffness: 320 });
        haptics.medium();
      }}
      onPressOut={() => { btnScale.value = withSpring(1, springs.default); }}
      onPress={onPress}
    >
      <View style={styles.callButtonWrap}>
        <Animated.View style={[styles.callPulseRing, ringStyle]} pointerEvents="none" />
        <Animated.View style={[styles.callButton, btnStyle]}>
          <AppText variant="heading" color={THEME.colors.white}>📞</AppText>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────  Backspace  ───────────────────────────── */

function BackspaceButton({ onPress, onLongPress, disabled }) {
  const scale = useSharedValue(1);
  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
      }}
      onPressOut={() => { scale.value = withSpring(1, springs.default); }}
      onPress={() => { if (!disabled) onPress(); }}
      onLongPress={() => { if (!disabled) onLongPress(); }}
      delayLongPress={500}
      style={styles.backspaceHit}
    >
      <Animated.View
        style={[
          styles.backspace,
          { opacity: disabled ? 0.3 : 1 },
          useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] })),
        ]}
      >
        <AppText variant="label">⌫</AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Trust score card + donut  ───────────────────────────── */

const DONUT_SIZE = 80;
const DONUT_STROKE = 8;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRC = 2 * Math.PI * DONUT_RADIUS;

function TrustScoreCard({ score, verified }) {
  const max = 1000;
  const progress = useSharedValue(0);
  const scoreDriver = useSharedValue(0);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    progress.value = withTiming(score / max, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    scoreDriver.value = withTiming(score, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress, scoreDriver]);

  useAnimatedReaction(
    () => Math.round(scoreDriver.value),
    (current, prev) => {
      if (current !== prev) runOnJS(setDisplayed)(current);
    }
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: DONUT_CIRC * (1 - progress.value),
  }));

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreCardTop}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={THEME.colors.muted}>
            {STRINGS.dialer.trustScoreLabel}
          </AppText>
          <AppText variant="display" style={styles.scoreNumber}>{displayed}</AppText>
        </View>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          <Circle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={DONUT_RADIUS}
            stroke={THEME.colors.subtle}
            strokeWidth={DONUT_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={DONUT_RADIUS}
            stroke={THEME.colors.primary}
            strokeWidth={DONUT_STROKE}
            fill="none"
            strokeDasharray={DONUT_CIRC}
            strokeLinecap="round"
            animatedProps={animatedProps}
            transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
          />
        </Svg>
      </View>

      <View style={styles.chipRow}>
        {verified?.idProof && <Chip label={STRINGS.dialer.chips.idVerified} />}
        {verified?.liveness && <Chip label={STRINGS.dialer.chips.liveness} />}
        <Chip label={STRINGS.dialer.chips.phone} />
      </View>
    </View>
  );
}

function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <AppText variant="caption" style={styles.chipText}>{label}</AppText>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  content: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
    gap: THEME.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
  },
  brand: {
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  iconButton: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.xl,
    gap: THEME.spacing.md,
  },
  scoreCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  scoreNumber: {
    fontSize: 36,
  },
  chipRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: THEME.colors.subtle,
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 10,
  },

  numberRow: {
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  dialPad: {
    gap: THEME.spacing.md,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  keyHit: {
    width: 72,
    height: 72,
  },
  key: {
    flex: 1,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  keyRipple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 36,
  },
  keySub: {
    fontSize: 9,
    lineHeight: 11,
    marginTop: 2,
  },

  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
  },
  callPlaceholder: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
  },
  callButtonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  callButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callPulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primary,
  },
  backspaceHit: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
  },
  backspace: {
    flex: 1,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
