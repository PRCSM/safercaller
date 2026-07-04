import { useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNowStrict } from 'date-fns';
import Animated, {
  Easing,
  cancelAnimation,
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
import { getTrustTier } from '../../utils/trust';
import { useAuthStore } from '../../store/authStore';
import { useDialerStore } from '../../store/dialerStore';
import { scamService } from '../../services';
import { toast } from '../../utils/toast';

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

const AVATAR_PALETTE = ['#9DC4F5', '#FFCAFC', '#FBE74E', '#A7CBF6', '#FFE0A7', '#C7E8C7'];

const formatNumber = (num) => {
  if (!num) return '';
  return num.length <= 5 ? num : `${num.slice(0, 5)} ${num.slice(5)}`;
};

const last4 = (num) => {
  if (!num) return '';
  const clean = num.replace(/\D/g, '');
  return clean.length >= 4 ? clean.slice(-4) : clean;
};

const initialsFor = (name) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Friendly labels for the user's OWN score (the trust spectrum's generic
// "Trusted/Neutral/High risk" reads oddly about yourself). Colour + icon still
// come from the shared trust model so the whole app stays consistent.
const OWN_SCORE_LABEL = { safe: 'Good', caution: 'Fair', danger: 'Low' };

export default function DialerScreen({ navigation }) {
  const profile = useAuthStore((s) => s.profile);
  const currentNumber = useDialerStore((s) => s.currentNumber);
  const callLogs = useDialerStore((s) => s.callLogs);
  const addDigit = useDialerStore((s) => s.addDigit);
  const deleteDigit = useDialerStore((s) => s.deleteDigit);
  const clearNumber = useDialerStore((s) => s.clearNumber);
  const addCallLog = useDialerStore((s) => s.addCallLog);
  const setCurrentNumberRaw = useDialerStore.setState;

  const score = profile?.reputationScore ?? 0;
  const tier = getTrustTier(score);
  const tierLabel = OWN_SCORE_LABEL[tier.key];
  const missedCount = callLogs.filter((l) => l.status === 'missed').length;
  const blockedToday = callLogs.filter(
    (l) => l.status === 'flagged' || l.status === 'scamBlocked'
  ).length;
  const recentCalls = callLogs.slice(0, 6);
  const hasNumber = currentNumber.length > 0;

  const handleDigit = (digit) => addDigit(digit);
  const handleBackspace = () => deleteDigit();
  const handleBackspaceLong = () => { haptics.medium(); clearNumber(); };

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

  const handleRecentTap = (log) => {
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
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <AppText style={styles.wordmark}>
          SAFER<AppText style={styles.wordmarkBlue}>CALLER</AppText>
        </AppText>
        <View style={styles.topActions}>
          <Pressable onPress={() => toast.info('Search coming soon')} style={styles.iconButton} hitSlop={6}>
            <Ionicons name="search" size={18} color={THEME.colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => toast.info('Notifications coming soon')}
            style={[styles.iconButton, { marginLeft: 8 }]}
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={18} color={THEME.colors.textSecondary} />
            {missedCount > 0 && <View style={styles.bellBadge} />}
          </Pressable>
        </View>
      </View>

      {/* ── INLINE TRUST CHIP ── */}
      <View style={[styles.trustPill, { backgroundColor: tier.soft, borderColor: tier.soft }]}>
        <View style={styles.trustLeft}>
          <Ionicons name={tier.icon} size={14} color={tier.color} />
          <AppText style={styles.trustLabel}>TRUST</AppText>
          <AppText style={styles.trustScore}>{score}</AppText>
          <AppText style={[styles.tierLabel, { color: tier.color }]}>{tierLabel}</AppText>
        </View>
        <View style={styles.trustRight}>
          <Ionicons name="shield-checkmark" size={12} color={THEME.colors.trust.safe} />
          <AppText style={styles.trustStat}>
            {blockedToday} blocked today
          </AppText>
        </View>
      </View>

      {/* ── SMART DISPLAY AREA — number OR last-call card ── */}
      <View style={styles.displayArea}>
        {hasNumber ? (
          <AppText
            style={styles.numberText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatNumber(currentNumber)}
          </AppText>
        ) : recentCalls.length > 0 ? (
          <LastCallCard log={recentCalls[0]} onPress={() => handleRecentTap(recentCalls[0])} />
        ) : (
          <View style={styles.firstTimeWrap}>
            <Ionicons name="keypad" size={20} color={THEME.colors.border} />
            <AppText style={styles.firstTimeHint}>Tap a number to dial</AppText>
          </View>
        )}
      </View>

      {/* ── RECENT AVATAR STRIP — only when not typing AND have multiple logs ── */}
      {!hasNumber && recentCalls.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentStrip}
          style={styles.recentStripWrapper}
        >
          {recentCalls.slice(1, 6).map((log, idx) => (
            <RecentAvatar
              key={log.id}
              log={log}
              paletteIdx={idx}
              onPress={() => handleRecentTap(log)}
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
          <Ionicons name="time-outline" size={22} color={THEME.colors.textSecondary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Last-call card (empty state)  ───────────────────────────── */

function LastCallCard({ log, onPress }) {
  const dirIcon =
    log.status === 'missed'    ? { name: 'call-outline',       color: THEME.colors.trust.danger } :
    log.direction === 'inbound' ? { name: 'arrow-down-circle',  color: THEME.colors.trust.safe } :
                                  { name: 'arrow-up-circle',    color: THEME.colors.primary };
  const when = log.createdAt
    ? formatDistanceToNowStrict(
        log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt),
        { addSuffix: true }
      )
    : '';
  const display = log.name ?? `+${last4(log.number)}`;

  return (
    <Pressable onPress={onPress} style={styles.lastCallCard}>
      <View style={styles.lastCallLeft}>
        <View style={[styles.lastCallAvatar, { backgroundColor: AVATAR_PALETTE[0] }]}>
          <AppText style={styles.lastCallInitials}>{initialsFor(display)}</AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.lastCallRow}>
            <Ionicons name={dirIcon.name} size={12} color={dirIcon.color} />
            <AppText style={styles.lastCallName} numberOfLines={1}>
              {display}
            </AppText>
          </View>
          <AppText style={styles.lastCallTime}>{when}</AppText>
        </View>
      </View>
      <View style={styles.lastCallCta}>
        <Ionicons name="call" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────  Recent avatar (strip)  ───────────────────────────── */

function RecentAvatar({ log, paletteIdx, onPress }) {
  const display = log.name ?? `+${last4(log.number)}`;
  const bg = AVATAR_PALETTE[paletteIdx % AVATAR_PALETTE.length];
  return (
    <Pressable onPress={onPress} style={styles.recentAvatarWrap} hitSlop={6}>
      <View style={[styles.recentAvatar, { backgroundColor: bg }]}>
        <AppText style={styles.recentInitials}>{initialsFor(display)}</AppText>
      </View>
      <AppText style={styles.recentLabel} numberOfLines={1}>
        {display}
      </AppText>
    </Pressable>
  );
}

/* ─────────────────────────────  Dial key  ───────────────────────────── */

function DialKey({ digit, sub, onPress }) {
  const scale = useSharedValue(1);
  const bgDarken = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    bgDarken.value = withTiming(1, { duration: 60 });
    haptics.light();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    bgDarken.value = withTiming(0, { duration: 140 });
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgDarken.value > 0.5 ? THEME.colors.subtle : THEME.colors.surfaceAlt,
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

/* ─────────────────────────────  Call button  ───────────────────────────── */

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
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  return (
    <Pressable
      onPressIn={() => { btnScale.value = withSpring(0.92, { damping: 15, stiffness: 320 }); haptics.medium(); }}
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
        <Ionicons name="backspace-outline" size={24} color={THEME.colors.textSecondary} />
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
  },
  wordmark: {
    fontSize: 17,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.textPrimary,
    letterSpacing: 0.4,
  },
  wordmarkBlue: { color: THEME.colors.primary },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.surfaceAlt,
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
    backgroundColor: THEME.colors.trust.danger,
    borderWidth: 1.5,
    borderColor: THEME.colors.white,
  },

  /* Trust chip — inline horizontal info bar */
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 4,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  trustLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: {
    fontSize: 9,
    fontFamily: THEME.typography.fontFamily.medium,
    color: THEME.colors.textMuted,
    letterSpacing: 1.4,
  },
  trustScore: {
    fontSize: 15,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.textPrimary,
    marginLeft: 2,
  },
  tierLabel: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.semibold,
    marginLeft: 4,
  },
  trustRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustStat: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.medium,
    color: THEME.colors.textSecondary,
  },

  /* Smart display area — number when typing, last-call card when empty */
  displayArea: {
    minHeight: 64,
    paddingHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 36,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.textPrimary,
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  /* Empty-state first time */
  firstTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  firstTimeHint: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.medium,
    color: THEME.colors.textDisabled,
  },

  /* Last call card */
  lastCallCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.hairline,
  },
  lastCallLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  lastCallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastCallInitials: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.white,
  },
  lastCallRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastCallName: {
    fontSize: 14,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  lastCallTime: {
    fontSize: 11,
    fontFamily: THEME.typography.fontFamily.medium,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  lastCallCta: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Recent avatar strip */
  recentStripWrapper: { maxHeight: 64, marginTop: 8 },
  recentStrip: {
    paddingHorizontal: 20,
    gap: 14,
    alignItems: 'center',
  },
  recentAvatarWrap: { alignItems: 'center', width: 52 },
  recentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInitials: {
    fontSize: 13,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.white,
  },
  recentLabel: {
    fontSize: 10,
    fontFamily: THEME.typography.fontFamily.medium,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  /* Dial pad */
  dialPad: {
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyHit: {
    width: 92,
    height: 68,
  },
  key: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: THEME.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: {
    fontSize: 26,
    fontFamily: THEME.typography.fontFamily.semibold,
    color: THEME.colors.textPrimary,
    lineHeight: 30,
  },
  keyDigitSpecial: { fontSize: 22, fontWeight: '400' },
  keySub: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontFamily.medium,
    marginTop: 1,
  },

  /* Action row */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    marginTop: 12,
    height: 92,
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
    width: 88,
    height: 88,
  },
  callButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  callPulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
});

// STRINGS import retained for future use (greeting/sub strings still defined).
void STRINGS;
