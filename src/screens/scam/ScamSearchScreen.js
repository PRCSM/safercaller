import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolateColor,
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
import { springs } from '../../constants/animations';
import { scamService } from '../../services';
import { toast } from '../../utils/toast';

const FILTERS = [
  { id: 'all',              label: 'All' },
  { id: 'UPI Fraud',        label: 'UPI Fraud' },
  { id: 'Fake Jobs',        label: 'Fake Jobs' },
  { id: 'Phishing',         label: 'Phishing' },
  { id: 'Romance Scam',     label: 'Romance Scam' },
  { id: 'Investment Fraud', label: 'Investment Fraud' },
  { id: 'Cyber Fraud',      label: 'Cyber Fraud' },
];

const RISK_BADGE = {
  open:      { label: 'HIGH RISK', bg: THEME.colors.coral,   fg: THEME.colors.white, iconName: 'alert-circle', iconColor: '#fff' },
  resolved:  { label: 'RESOLVED',  bg: THEME.colors.primary, fg: THEME.colors.white, iconName: 'checkmark-circle', iconColor: '#fff' },
  reviewing: { label: 'REVIEWING', bg: THEME.colors.warning, fg: THEME.colors.text,  iconName: 'time', iconColor: '#000' },
};
const STATUS_ACCENT = {
  open: THEME.colors.coral, resolved: THEME.colors.primary, reviewing: THEME.colors.warning,
};
const STATUS_PILL_BG = {
  open: 'rgba(255,90,77,0.12)', resolved: 'rgba(0,102,255,0.15)', reviewing: 'rgba(251,231,78,0.25)',
};
const STATUS_PILL_FG = {
  open: THEME.colors.coral, resolved: THEME.colors.primary, reviewing: THEME.colors.text,
};

const DEBOUNCE_MS = 300;

export default function ScamSearchScreen({ navigation, route }) {
  const inputRef = useRef(null);
  const [queryText, setQueryText] = useState(route?.params?.initialQuery ?? '');
  const [activeFilter, setActiveFilter] = useState(route?.params?.initialFilter ?? 'all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Autofocus once on mount.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Debounced search whenever query or filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const filters = activeFilter === 'all' ? {} : { category: activeFilter };
        const data = await scamService.searchScamReports(queryText.trim(), filters);
        if (!cancelled) setResults(data ?? []);
      } catch (err) {
        if (!cancelled) toast.error('Search failed', err?.message ?? '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, queryText.trim().length === 0 ? 0 : DEBOUNCE_MS);

    return () => { cancelled = true; clearTimeout(handle); };
  }, [queryText, activeFilter]);

  const openDetail = (report) => {
    navigation.navigate('ScamDetail', { report });
  };

  const resultsLabel = queryText.trim().length === 0
    ? 'Search by name, number, or keyword'
    : `${results.length} result${results.length === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </Pressable>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#5A585A" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Search reports…"
              placeholderTextColor={THEME.colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
              autoCorrect={false}
            />
            {queryText.length > 0 && (
              <Pressable hitSlop={6} onPress={() => setQueryText('')}>
                <Ionicons name="close-circle" size={18} color="#5A585A" />
              </Pressable>
            )}
          </View>

          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <AppText variant="caption" color={THEME.colors.primary}>Cancel</AppText>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              active={activeFilter === f.id}
              onPress={() => setActiveFilter(f.id)}
            />
          ))}
        </ScrollView>

        <AppText variant="caption" color={THEME.colors.muted} style={styles.resultsLabel}>
          {resultsLabel}
        </AppText>

        {loading ? (
          <View style={styles.skeletonWrap}>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={8}
            renderItem={({ item, index }) => (
              <ResultCard report={item} index={index} onPress={() => openDetail(item)} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons
                  name={queryText.trim().length === 0 ? 'search' : 'help-circle-outline'}
                  size={48}
                  color="#D1D6D2"
                  style={styles.emptyIcon}
                />
                <AppText variant="label" style={styles.emptyTitle}>
                  {queryText.trim().length === 0
                    ? 'Search by name, number or keyword'
                    : 'No results found'}
                </AppText>
                {queryText.trim().length > 0 && (
                  <AppText variant="caption" color={THEME.colors.muted} style={styles.emptySub}>
                    Nothing matched "{queryText.trim()}"
                  </AppText>
                )}
              </View>
            }
          />
        )}
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ───── Filter chip ───── */

function FilterChip({ label, active, onPress }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, progress]);
  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value, [0, 1],
      [THEME.colors.subtle, THEME.colors.dark]
    ),
  }));
  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.chip, animStyle]}>
        <AppText variant="caption" color={active ? THEME.colors.white : THEME.colors.text}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ───── Result card ───── */

function ResultCard({ report, index, onPress }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, 10) * 50;
    ty.value = withDelay(delay, withSpring(0, springs.default));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  const status = report.status ?? 'open';
  const badge = RISK_BADGE[status] ?? RISK_BADGE.open;
  const accent = STATUS_ACCENT[status] ?? THEME.colors.coral;
  const pillBg = STATUS_PILL_BG[status] ?? STATUS_PILL_BG.open;
  const pillFg = STATUS_PILL_FG[status] ?? STATUS_PILL_FG.open;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={[styles.cardStrip, { backgroundColor: accent }]} />

        <View style={styles.cardHeader}>
          <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {report.scammerName ?? 'Unknown Scammer'}
          </AppText>
          <View style={[styles.riskBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.iconName} size={11} color={badge.iconColor} />
            <AppText variant="caption" color={badge.fg} style={styles.riskBadgeText}>
              {badge.label}
            </AppText>
          </View>
        </View>

        <AppText variant="caption" color={THEME.colors.muted}>
          {report.scammerPhone ?? report.email ?? ''}
        </AppText>

        {!!report.category && (
          <View style={[styles.categoryChip, { backgroundColor: pillBg }]}>
            <AppText variant="caption" color={pillFg} style={styles.categoryChipText}>
              {report.category}
            </AppText>
          </View>
        )}

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <AppText variant="caption" color={THEME.colors.muted} style={{ flex: 1 }}>
            {report.complaintCount ?? 1} complaint{(report.complaintCount ?? 1) === 1 ? '' : 's'} · Score {report.reputationScore ?? 0}
          </AppText>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <AppText variant="caption" color={pillFg} style={styles.statusPillText}>
              {status === 'open' ? 'Open' : status === 'resolved' ? 'Resolved' : 'Reviewing'}
            </AppText>
          </View>
          <AppText variant="caption" color={THEME.colors.primary}>View →</AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ───── Styles ───── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.white },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  backButton: {
    width: THEME.sizes?.iconButton ?? 40,
    height: THEME.sizes?.iconButton ?? 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: THEME.colors.dark,
    backgroundColor: THEME.colors.white,
    gap: 8,
  },
  searchIcon: { marginRight: 0 },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: THEME.colors.text,
    paddingVertical: 0,
  },

  chipRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xs ?? 4,
    paddingBottom: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultsLabel: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
    fontSize: 12,
  },

  skeletonWrap: {
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },

  list: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 120,
    gap: THEME.spacing.md,
  },

  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    paddingLeft: 20,
    gap: 6,
    overflow: 'hidden',
  },
  cardStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  riskBadgeText: { fontSize: 10, fontWeight: '600' },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 35,
  },
  categoryChipText: { fontSize: 10 },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 35,
  },
  statusPillText: { fontSize: 10 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
