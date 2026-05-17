import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
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

const formatNumber = (num) => {
  if (!num) return '';
  return num.length <= 5 ? num : `${num.slice(0, 5)} ${num.slice(5)}`;
};

const formatShortNumber = (num) => {
  if (!num) return '';
  const clean = num.replace('+91', '');
  return clean.length > 7 ? `${clean.slice(0, 7)}…` : clean;
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

  const hasNumber = currentNumber.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <AppText style={styles.wordmark}>
          SAFER<AppText style={styles.wordmarkBlue}>CALLER</AppText>
        </AppText>
        <View style={styles.topActions}>
          <Pressable onPress={() => toast.info('Search coming soon')} style={styles.iconButton} hitSlop={6}>
            <Ionicons name="search" size={19} color="#5A585A" />
          </Pressable>
          <Pressable
            onPress={() => toast.info('Notifications coming soon')}
            style={[styles.iconButton, { marginLeft: 8 }]}
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={19} color="#5A585A" />
            {missedCount > 0 && <View style={styles.bellBadge} />}
          </Pressable>
        </View>
      </View>

      {/* ── COMPACT TRUST BAR ── */}
      <TrustBar score={score} verified={profile?.verified} />

      {/* ── NUMBER DISPLAY ── */}
      <View style={styles.numberRow}>
        {hasNumber ? (
          <AppText style={styles.numberText} numberOfLines={1} adjustsFontSizeToFit>
            {formatNumber(currentNumber)}
          </AppText>
        ) : (
          <AppText style={styles.numberPlaceholder}>Enter number…</AppText>
        )}
      </View>

      {/* ── RECENT CALLS STRIP — hidden when typing ── */}
      {!hasNumber && recentCalls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentStrip}
          style={styles.recentStripWrapper}
        >
          {recentCalls.map((log) => (
            <RecentChip
              key={log.id}
              log={log}
              onPress={() => handleRecentChipPress(log)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── DIAL PAD ── */}
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

      {/* ── ACTION ROW ── */}
      <View style={styles.actionRow}>
        <BackspaceButton
          onPress={handleBackspace}
          onLongPress={handleBackspaceLong}
          visible={hasNumber}
        />
        <CallButton onPress={handleCallPress} />
        <Pressable onPress={openRecents} style={styles.actionSide} hitSlop={6}>
          <Ionicons name="time-outline" size={22} color="#5A585A" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Recent-calls chip  ───────────────────────────── */

function RecentChip({ log, onPress }) {
  const direction = log.status === 'missed'
    ? 'missed'
    : log.direction ?? 'outbound';

  const iconProps =
    direction === 'missed'
      ? { name: 'call-outline', color: '#FF5A4D' }
      : direction === 'inbound'
        ? { name: 'arrow-down-circle', color: '#22C55E' }
        : { name: 'arrow-up-circle', color: '#0066FF' };

  const display = (log.name ?? formatShortNumber(log.number) ?? '').slice(0, 12);

  return (
    <Pressable onPress={onPress} style={styles.recentChip} hitSlop={6}>
      <Ionicons name={iconProps.name} size={12} color={iconProps.color} />
      <AppText style={styles.recentChipText} numberOfLines={1}>
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
    scale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
    bgDarken.value = withTiming(1, { duration: 80 });
    haptics.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    bgDarken.value = withTiming(0, { duration: 150 });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgDarken.value > 0.5 ? '#E8E8E8' : '#F5F5F5',
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
        {!!sub && <AppText style={styles.keySub}>{sub}</AppText>}
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
    transform: [{ scale: 1 + ringProgress.value * 0.35 }],
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
          <Ionicons name="call" size={30} color="#fff" />
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
    <Pressable
      onPressIn={() => {
        if (!visible) return;
        scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
      }}
      onPressOut={() => { scale.value = withSpring(1, springs.default); }}
      onPress={() => { if (visible) onPress(); }}
      onLongPress={() => { if (visible) onLongPress(); }}
      delayLongPress={500}
      style={styles.actionSide}
      disabled={!visible}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={animStyle}>
        <Ionicons name="backspace-outline" size={24} color="#5A585A" />
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Compact Trust Bar with mini ring  ───────────────────────────── */

const RING_SIZE = 40;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function TrustBar({ score, verified }) {
  const max = 1000;
  const progress = useSharedValue(0);
  const scoreDriver = useSharedValue(0);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    progress.value = withTiming(score / max, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    scoreDriver.value = withTiming(score, {
      duration: 900,
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
    strokeDashoffset: RING_CIRC * (1 - progress.value),
  }));

  const ringColor = score > 600 ? '#0066FF' : score > 300 ? '#FBE74E' : '#FF5A4D';
  const tier = score > 600 ? 'Good' : score > 300 ? 'Fair' : 'Low';
  const tierColor = score > 600 ? '#0066FF' : score > 300 ? '#856f00' : '#FF5A4D';

  return (
    <View style={styles.trustBar}>
      <View style={styles.trustLeft}>
        <AppText style={styles.trustLabel}>TRUST</AppText>
        <AppText style={styles.trustScore}>{displayed}</AppText>
        {verified?.idProof && (
          <View style={styles.verifyChip}>
            <Ionicons name="checkmark-circle" size={10} color="#22C55E" />
            <AppText style={styles.verifyChipText}>Verified</AppText>
          </View>
        )}
      </View>
      <View style={styles.miniRingWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="#ECEFEC"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRC}
            strokeLinecap="round"
            animatedProps={animatedProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <AppText style={[styles.miniRingTier, { color: tierColor }]}>{tier}</AppText>
      </View>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  wordmark: {
    fontSize: 17,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    letterSpacing: 0.5,
  },
  wordmarkBlue: { color: THEME.colors.primary },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF5A4D',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  /* Trust bar */
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    height: 48,
    backgroundColor: '#F9FAF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECEFEC',
    paddingHorizontal: 16,
  },
  trustLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustLabel: {
    fontSize: 9,
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#5A585A',
    letterSpacing: 1.5,
  },
  trustScore: {
    fontSize: 20,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    marginLeft: 4,
  },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 35,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  verifyChipText: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#22C55E',
  },
  miniRingWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRingTier: {
    fontSize: 8,
    fontFamily: THEME.typography.fontFamily.semibold,
  },

  /* Number display */
  numberRow: {
    height: 60,
    paddingHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 36,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  numberPlaceholder: {
    fontSize: 22,
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#D1D6D2',
  },

  /* Recent strip */
  recentStripWrapper: {
    marginTop: 6,
    maxHeight: 40,
  },
  recentStrip: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAF9',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEFEC',
    paddingHorizontal: 12,
    height: 34,
  },
  recentChipText: {
    fontSize: 12,
    fontFamily: THEME.typography.fontFamily.medium,
    color: '#000',
    maxWidth: 80,
  },

  /* Dial pad */
  dialPad: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyHit: {
    width: 100,
    height: 72,
  },
  key: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: {
    fontSize: 26,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: '#000',
    lineHeight: 30,
  },
  keyDigitSpecial: { fontSize: 22, fontWeight: '300' },
  keySub: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#999',
    fontFamily: THEME.typography.fontFamily.medium,
    marginTop: 1,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: 8,
    height: 80,
  },
  actionSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  callPulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
});
