import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { formatDistanceToNowStrict, isToday, isYesterday, format } from 'date-fns';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { RowSkeleton } from '../../components/common/Skeleton';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics } from '../../constants/animations';
import { useDialerStore } from '../../store/dialerStore';
import { mockCallLogs } from '../../services/mock/mockData';
import { IS_MOCK } from '../../constants/config';
import { toast } from '../../utils/toast';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_DELETE_THRESHOLD = 120;
const SWIPE_VELOCITY = 500;

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'missed',       label: 'Missed' },
  { id: 'scamBlocked',  label: 'Scam Blocked' },
  { id: 'recorded',     label: 'Recorded' },
  { id: 'receptionist', label: 'Receptionist' },
];

const matchesFilter = (log, filter) => {
  if (filter === 'all') return true;
  if (filter === 'missed') return log.status === 'missed';
  if (filter === 'scamBlocked') return log.status === 'flagged' || log.status === 'scamBlocked';
  if (filter === 'recorded') return !!log.recordingUrl;
  if (filter === 'receptionist') return log.status === 'receptionist';
  return true;
};

const groupKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
};

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
};

export default function CallLogsScreen({ navigation }) {
  const callLogs = useDialerStore((s) => s.callLogs);
  const addCallLog = useDialerStore((s) => s.addCallLog);
  const deleteCallLog = useDialerStore((s) => s.deleteCallLog);
  const addBlockedNumber = useDialerStore((s) => s.addBlockedNumber);
  const setCurrentNumber = useDialerStore.setState;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // First-mount bootstrap: if the store is empty and we're in mock mode,
  // seed it with the mock logs so the screen feels populated.
  const seededOnce = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!seededOnce.current && IS_MOCK && callLogs.length === 0) {
        seededOnce.current = true;
        // Reverse so the oldest gets unshifted first → newest ends up on top.
        [...mockCallLogs].reverse().forEach(addCallLog);
      }
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = callLogs.filter((l) => matchesFilter(l, filter));

  // Group into [{ key: 'Today', items: [...] }, …] — keeps date headers
  // inline in the FlatList without juggling SectionList APIs.
  const grouped = (() => {
    const out = [];
    let lastKey = null;
    filtered.forEach((log) => {
      const k = groupKey(log.createdAt);
      if (k !== lastKey) {
        out.push({ type: 'header', key: `h-${k}-${out.length}`, label: k });
        lastKey = k;
      }
      out.push({ type: 'row', key: log.id, log });
    });
    return out;
  })();

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    // Real impl: callLogsService.getCallLogs(uid). Mock: small delay.
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  };

  const callBack = (log) => {
    haptics.light();
    setCurrentNumber({ currentNumber: log.number ?? '' });
    navigation.getParent()?.navigate('DialerTab')
      ?? toast.info('Number set — switch to Dialer tab');
  };

  const blockNumber = (log) => {
    addBlockedNumber(log.number);
    haptics.success();
    toast.success('Number blocked', log.number);
  };

  const deleteRow = (log) => {
    deleteCallLog(log.id);
    haptics.medium();
    toast.info('Call log deleted');
  };

  const openCallDetail = (log) => {
    toast.info('Call detail coming soon', log.number);
  };

  const showActionSheet = (log) => {
    haptics.medium();
    Alert.alert(
      log.name ?? log.number ?? 'Call options',
      log.number ?? '',
      [
        { text: 'Call back', onPress: () => callBack(log) },
        { text: 'Block', onPress: () => blockNumber(log) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRow(log) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.header}>
          <AppText variant="heading">{STRINGS.callLogs.title}</AppText>
          <Pressable style={styles.filterIcon} hitSlop={8} onPress={() => toast.info('Filters coming soon')}>
            <AppText variant="label">⋮</AppText>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {FILTERS.map((f) => (
            <FilterPill
              key={f.id}
              label={f.label}
              active={filter === f.id}
              onPress={() => { haptics.light(); setFilter(f.id); }}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.key}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={8}
            renderItem={({ item, index }) =>
              item.type === 'header' ? (
                <SectionHeader label={item.label} />
              ) : (
                <SwipeableRow onDelete={() => deleteRow(item.log)}>
                  <LogRow
                    log={item.log}
                    index={index}
                    onPress={() => openCallDetail(item.log)}
                    onLongPress={() => showActionSheet(item.log)}
                  />
                </SwipeableRow>
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={THEME.colors.primary}
                colors={[THEME.colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <AppText variant="caption" color={THEME.colors.muted}>
                  No calls match this filter.
                </AppText>
              </View>
            }
            contentContainerStyle={styles.list}
          />
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Filter pill  ───────────────────────────── */

function FilterPill({ label, active, onPress }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, progress]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [THEME.colors.subtle, THEME.colors.dark]
    ),
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.chip, animStyle]}>
        <AppText
          variant="caption"
          color={active ? THEME.colors.white : THEME.colors.text}
        >
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Section header  ───────────────────────────── */

function SectionHeader({ label }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="caption" color={THEME.colors.muted} style={styles.sectionText}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

/* ─────────────────────────────  Row + stagger  ───────────────────────────── */

const AVATAR_COLOR = {
  flagged:      'rgba(255,90,77,0.12)',
  scamBlocked:  'rgba(255,90,77,0.12)',
  safe:         'rgba(0,102,255,0.12)',
  missed:       'rgba(251,231,78,0.18)',
  receptionist: THEME.colors.subtle,
};

const STATUS_TEXT_COLOR = {
  flagged:     THEME.colors.coral,
  scamBlocked: THEME.colors.coral,
  safe:        THEME.colors.primary,
  missed:      THEME.colors.coral,
  receptionist: THEME.colors.muted,
};

function avatarInitials(log) {
  if (log.name) {
    const p = log.name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'UN';
  }
  return 'UN';
}

function LogRow({ log, index, onPress, onLongPress }) {
  const ty = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, 12) * 60;
    ty.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 220 }));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  const avatarBg = AVATAR_COLOR[log.status] ?? THEME.colors.subtle;
  const statusColor = STATUS_TEXT_COLOR[log.status] ?? THEME.colors.muted;
  const time = log.createdAt
    ? formatDistanceToNowStrict(
        log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt),
        { addSuffix: true }
      )
    : '';
  const duration = formatDuration(log.duration);

  const subline = [
    log.direction === 'inbound' ? '↓' :
    log.direction === 'outbound' ? '↑' :
    log.direction === 'missed' ? '✕' : '',
    log.status === 'flagged' ? 'Scam Blocked' :
    log.status === 'missed' ? 'Missed' :
    log.status === 'receptionist' ? 'Receptionist' :
    log.direction === 'outbound' ? 'Outgoing' :
    log.direction === 'inbound' ? 'Incoming' : '',
    duration,
    time,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
      <Animated.View style={[styles.row, rowStyle]}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <AppText variant="caption" color={statusColor}>
            {avatarInitials(log)}
          </AppText>
        </View>
        <View style={styles.rowBody}>
          <AppText variant="label" numberOfLines={1}>
            {log.name ?? log.number}
          </AppText>
          <AppText variant="caption" color={statusColor} numberOfLines={1}>
            {subline}
          </AppText>
        </View>
        <StatusEnd log={log} statusColor={statusColor} />
      </Animated.View>
    </Pressable>
  );
}

function StatusEnd({ log, statusColor }) {
  if (log.status === 'flagged' || log.status === 'scamBlocked') {
    return (
      <View style={[styles.statusPill, { backgroundColor: 'rgba(255,90,77,0.1)' }]}>
        <AppText variant="caption" color={THEME.colors.coral}>🔴 Flagged</AppText>
      </View>
    );
  }
  if (log.status === 'safe') {
    return (
      <View style={[styles.statusPill, { backgroundColor: 'rgba(0,102,255,0.1)' }]}>
        <AppText variant="caption" color={THEME.colors.primary}>🟢 Safe</AppText>
      </View>
    );
  }
  if (log.status === 'missed') {
    return (
      <View style={styles.callBackBtn}>
        <AppText variant="label">📞</AppText>
      </View>
    );
  }
  if (log.status === 'receptionist') {
    return (
      <View style={styles.callBackBtn}>
        <AppText variant="label">▶</AppText>
      </View>
    );
  }
  return null;
}

/* ─────────────────────────────  Swipe-to-delete wrapper  ───────────────────────────── */

function SwipeableRow({ children, onDelete }) {
  const tx = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      if (e.translationX < 0) tx.value = e.translationX;
    })
    .onEnd((e) => {
      const farEnough = e.translationX < -SWIPE_DELETE_THRESHOLD;
      const fastSwipe = e.velocityX < -SWIPE_VELOCITY;
      if (farEnough || fastSwipe) {
        tx.value = withTiming(-SCREEN_WIDTH, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onDelete)();
        });
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const deleteHintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, -tx.value / SWIPE_DELETE_THRESHOLD),
  }));

  return (
    <View style={styles.swipeRoot}>
      <Animated.View style={[styles.deleteBg, deleteHintStyle]} pointerEvents="none">
        <AppText variant="label" color={THEME.colors.white}>Delete</AppText>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  filterIcon: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    paddingBottom: THEME.spacing.xxxl,
  },

  sectionHeader: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: 4,
  },
  sectionText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  swipeRoot: {
    position: 'relative',
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.coral,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: THEME.spacing.lg,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.subtle,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  callBackBtn: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: THEME.spacing.huge,
  },
});
