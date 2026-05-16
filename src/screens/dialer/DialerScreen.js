import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { getHours, formatDistanceToNowStrict } from 'date-fns';
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
  // Direct setter access to fill number from a recent-chip tap without
  // typing each digit.
  const setCurrentNumberRaw = useDialerStore.setState;

  const score = profile?.reputationScore ?? 0;
  const firstName = (profile?.name ?? '').split(' ')[0];
  const greeting = greetingFor(getHours(new Date()));
  const spamBlockedToday = callLogs.filter(
    (l) => l.status === 'flagged' || l.status === 'scamBlocked'
  ).length;
  const missedCount = callLogs.filter((l) => l.status === 'missed').length;
  const recentCalls = callLogs.slice(0, 5);

  const handleDigit = (digit) => addDigit(digit);
  const handleBackspace = () => deleteDigit();
  const handleBackspaceLong = () => {
    haptics.medium();
    clearNumber();
  };

  const handleCallPress = async () => {
    if (!currentNumber) {
      toast.warning('Enter a number first');
      haptics.error();
      return;
    }
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

  const handleRecentChipPress = (log) => {
    haptics.light();
    setCurrentNumberRaw({ currentNumber: log.number ?? '' });
  };

  const openRecents = () => {
    haptics.light();
    navigation.getParent()?.navigate('RecentsTab')
      ?? toast.info('Switch to Recents tab to see all calls');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <AppText variant="body" style={styles.brand}>{STRINGS.app.name}</AppText>
            <View style={styles.topActions}>
              <Pressable onPress={() => toast.info('Search coming soon')} style={styles.iconButton} hitSlop={6}>
                <Ionicons name="search" size={20} color="#5A585A" />
              </Pressable>
              <Pressable
                onPress={() => toast.info('Notifications coming soon')}
                style={styles.iconButton}
                hitSlop={6}
              >
                <Ionicons name="notifications-outline" size={20} color="#5A585A" />
                {missedCount > 0 && <View style={styles.bellBadge} />}
              </Pressable>
            </View>
          </View>

          {/* Trust score card */}
          <TrustScoreCard score={score} verified={profile?.verified} />

          {/* Greeting */}
          <View style={styles.greetingWrap}>
            <AppText variant="body" style={styles.greeting}>
              {greeting}{firstName ? `  ${firstName}` : ''} 👋
            </AppText>
            <AppText
              variant="caption"
              color={spamBlockedToday > 0 ? THEME.colors.primary : THEME.colors.muted}
              style={styles.greetingSub}
            >
              {spamBlockedToday > 0
                ? STRINGS.dialer.blockedToday(spamBlockedToday)
                : 'No spam blocked today'}
            </AppText>
          </View>

          {/* Recent calls strip */}
          {recentCalls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recentCalls.map((log) => (
                <RecentChip
                  key={log.id}
                  log={log}
                  active={currentNumber && log.number === currentNumber}
                  onPress={() => handleRecentChipPress(log)}
                />
              ))}
            </ScrollView>
          )}

          {/* Number display */}
          <View style={styles.numberRow}>
            {currentNumber.length === 0 ? (
              <AppText style={styles.numberPlaceholder}>
                Enter number…
              </AppText>
            ) : (
              currentNumber.split('').map((char, i) => (
                <Animated.View
                  key={`${i}`}
                  entering={FadeIn.duration(100)}
                  exiting={FadeOut.duration(80)}
                >
                  <AppText style={styles.numberChar}>{char}</AppText>
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

          {/* Call action row */}
          <View style={styles.callRow}>
            <BackspaceButton
              onPress={handleBackspace}
              onLongPress={handleBackspaceLong}
              visible={currentNumber.length > 0}
            />
            <CallButton onPress={handleCallPress} />
            <Pressable onPress={openRecents} style={styles.recentsButton} hitSlop={6}>
              <Ionicons name="time-outline" size={22} color="#5A585A" />
            </Pressable>
          </View>
        </ScrollView>
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Recent-calls chip  ───────────────────────────── */

function RecentChip({ log, active, onPress }) {
  const direction = log.status === 'missed'
    ? 'missed'
    : log.direction ?? 'outbound';

  const iconProps =
    direction === 'missed'
      ? { name: 'call-outline', color: '#FF5A4D' }
      : direction === 'inbound'
        ? { name: 'arrow-down-circle', color: '#22C55E' }
        : { name: 'arrow-up-circle', color: '#0066FF' };

  const display = (log.name ?? log.number ?? '').slice(0, 10);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.recentChip, active && styles.recentChipActive]}
      hitSlop={6}
    >
      <Ionicons name={iconProps.name} size={16} color={iconProps.color} />
      <AppText variant="caption" style={styles.recentChipText}>
        {display || 'Unknown'}
      </AppText>
    </Pressable>
  );
}

/* ─────────────────────────────  Dial key  ───────────────────────────── */

function DialKey({ digit, sub, onPress }) {
  const scale = useSharedValue(1);
  const bgDarken = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
    bgDarken.value = withTiming(1, { duration: 100 });
    haptics.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.default);
    bgDarken.value = withTiming(0, { duration: 150 });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgDarken.value > 0.5 ? THEME.colors.subtle : THEME.colors.white,
  }));

  const isSpecial = digit === '*' || digit === '#';

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.keyHit}
    >
      <Animated.View style={[styles.key, buttonStyle]}>
        <AppText style={[styles.keyDigit, isSpecial && styles.keyDigitSpecial]}>
          {digit === '*' ? '✱' : digit}
        </AppText>
        {!!sub && (
          <AppText style={styles.keySub}>{sub}</AppText>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Call button (pulse ring + glow)  ───────────────────────────── */

function CallButton({ onPress }) {
  const ringProgress = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    ringProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) }),
      -1,
      false
    );
    return () => cancelAnimation(ringProgress);
  }, [ringProgress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ringProgress.value * 0.4 }],
    opacity: 0.3 * (1 - ringProgress.value),
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
          <Ionicons name="call" size={32} color="#fff" />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────  Backspace  ───────────────────────────── */

function BackspaceButton({ onPress, onLongPress, visible }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 180 });
  }, [visible, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableShim
      onPressIn={() => {
        if (!visible) return;
        scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
      }}
      onPressOut={() => { scale.value = withSpring(1, springs.default); }}
      onPress={() => { if (visible) onPress(); }}
      onLongPress={() => { if (visible) onLongPress(); }}
      delayLongPress={500}
      style={styles.backspaceHit}
      disabled={!visible}
    >
      <Animated.View style={[styles.backspace, animStyle]}>
        <Ionicons name="backspace-outline" size={24} color="#5A585A" />
      </Animated.View>
    </AnimatedPressableShim>
  );
}

// Tiny shim so the pressable disables hit-testing when the button is
// fully transparent (otherwise users could tap an invisible target).
function AnimatedPressableShim({ disabled, ...rest }) {
  return <Pressable {...rest} disabled={disabled} pointerEvents={disabled ? 'none' : 'auto'} />;
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

  const tier =
    score >= 700 ? 'Good' :
    score >= 400 ? 'Fair' : 'Low';

  return (
    <View style={styles.scoreCard}>
      <View style={styles.scoreCardTop}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.scoreLabel}>
            YOUR TRUST SCORE
          </AppText>
          <AppText style={styles.scoreNumber}>{displayed}</AppText>

          <View style={styles.chipRow}>
            <VerifyChip label="Phone" />
            {verified?.idProof && <VerifyChip label="ID" />}
            {verified?.liveness && <VerifyChip label="Liveness" />}
          </View>
        </View>

        <View style={styles.donutWrap}>
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
          <View style={styles.donutCenter} pointerEvents="none">
            <AppText style={styles.donutTier}>{tier}</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

function VerifyChip({ label }) {
  return (
    <View style={styles.chip}>
      <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
      <AppText style={styles.chipText}>{label}</AppText>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  content: {
    paddingBottom: 24,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: THEME.spacing.sm,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5A4D',
  },

  scoreCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F9FAF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D6D2',
    padding: 20,
  },
  scoreCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: '#5A585A',
    textTransform: 'uppercase',
  },
  scoreNumber: {
    fontSize: 40,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: THEME.borderRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#000',
  },
  donutWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTier: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    fontFamily: THEME.typography.fontFamily.semibold,
  },

  greetingWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily.medium,
  },
  greetingSub: {
    fontSize: 13,
    marginTop: 2,
  },

  recentRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#F9FAF9',
    borderWidth: 1,
    borderColor: '#D1D6D2',
  },
  recentChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(0,102,255,0.08)',
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#000',
  },

  numberRow: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 16,
  },
  numberChar: {
    fontSize: 36,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    letterSpacing: 2,
  },
  numberPlaceholder: {
    fontSize: 28,
    color: '#D1D6D2',
    fontFamily: THEME.typography.fontFamily.medium,
  },

  dialPad: {
    marginHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  keyHit: {
    width: 76,
    height: 76,
  },
  key: {
    flex: 1,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: '#ECEFEC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  keyDigit: {
    fontSize: 28,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
  },
  keyDigitSpecial: {
    fontSize: 22,
    fontWeight: '300',
  },
  keySub: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#5A585A',
    marginTop: 1,
    fontFamily: THEME.typography.fontFamily.medium,
  },

  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  callButtonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 112,
    height: 112,
  },
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  callPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
  },
  backspaceHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspace: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECEFEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
