import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PageWrapper } from '../../components/common/PageWrapper';
import { AppText } from '../../components/common/AppText';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics, springs } from '../../constants/animations';
import { scamService } from '../../services';
import { useScamStore } from '../../store/scamStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../utils/toast';

const FILTERS = [
  { id: 'all',               label: 'All' },
  { id: 'UPI Fraud',         label: 'UPI Fraud' },
  { id: 'Fake Jobs',         label: 'Fake Jobs' },
  { id: 'Phishing',          label: 'Phishing' },
  { id: 'Romance Scam',      label: 'Romance Scam' },
  { id: 'Investment Fraud',  label: 'Investment Fraud' },
];

const RISK_BADGE = {
  open:      { label: 'HIGH RISK', bg: THEME.colors.coral,   fg: THEME.colors.white, iconName: 'alert-circle', iconColor: '#fff' },
  resolved:  { label: 'RESOLVED',  bg: THEME.colors.primary, fg: THEME.colors.white, iconName: 'checkmark-circle', iconColor: '#fff' },
  reviewing: { label: 'REVIEWING', bg: THEME.colors.warning, fg: THEME.colors.text,  iconName: 'time', iconColor: '#000' },
};

const STATUS_ACCENT = {
  open:      THEME.colors.coral,
  resolved:  THEME.colors.primary,
  reviewing: THEME.colors.warning,
};

const STATUS_PILL_BG = {
  open:      'rgba(255,90,77,0.12)',
  resolved:  'rgba(0,102,255,0.15)',
  reviewing: 'rgba(251,231,78,0.25)',
};

const STATUS_PILL_TEXT = {
  open:      THEME.colors.coral,
  resolved:  THEME.colors.primary,
  reviewing: THEME.colors.text,
};

export default function ScamHomeScreen({ navigation }) {
  const profile = useAuthStore((s) => s.profile);
  const location = profile?.location ?? 'Chennai';

  const searchResults = useScamStore((s) => s.searchResults);
  const searchQuery   = useScamStore((s) => s.searchQuery);
  const activeFilter  = useScamStore((s) => s.activeFilter);
  const isLoading     = useScamStore((s) => s.isLoading);
  const setSearchResults = useScamStore((s) => s.setSearchResults);
  const setQuery         = useScamStore((s) => s.setQuery);
  const setFilter        = useScamStore((s) => s.setFilter);
  const setLoading       = useScamStore((s) => s.setLoading);

  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const filters = activeFilter === 'all' ? {} : { category: activeFilter };
        const results = await scamService.searchScamReports(searchQuery ?? '', filters);
        if (!cancelled) setSearchResults(results);
      } catch (err) {
        if (!cancelled) toast.error('Could not load reports', err?.message ?? '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const openReport = () =>
    navigation.getParent()?.getParent()?.navigate('ReportScam')
      ?? navigation.navigate('ReportScam');

  const openDetail = (report) => {
    navigation.navigate('ScamDetail', { report });
  };

  const openSearch = () => {
    haptics.light();
    navigation.navigate('ScamSearch', {
      initialQuery: searchQuery ?? '',
      initialFilter: activeFilter,
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.header}>
          <AppText variant="heading">{STRINGS.scam.databaseTitle}</AppText>
        </View>

        <SearchBar
          value={searchQuery ?? ''}
          focused={searchFocused}
          setFocused={setSearchFocused}
          onPressInput={openSearch}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              active={activeFilter === f.id}
              onPress={() => { haptics.light(); setFilter(f.id); }}
            />
          ))}
        </ScrollView>

        <View style={styles.locationLine}>
          <View style={styles.locationCluster}>
            <Ionicons name="location-outline" size={14} color="#5A585A" />
            <AppText variant="caption" color={THEME.colors.muted}>
              Search near: {location}
            </AppText>
          </View>
          <View style={styles.locationCluster}>
            <Ionicons name="stats-chart-outline" size={14} color="#5A585A" />
            <AppText variant="caption" color={THEME.colors.muted}>
              {searchResults.length} results
            </AppText>
          </View>
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
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
              <AppText variant="caption" color={THEME.colors.muted}>
                {isLoading ? 'Loading…' : 'No reports match this filter.'}
              </AppText>
            </View>
          }
        />

        <FAB onPress={openReport} />
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Search bar  ───────────────────────────── */

function SearchBar({ value, focused, setFocused, onPressInput }) {
  const focusProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: 200 });
    scale.value = withSpring(focused ? 1.005 : 1, { damping: 18, stiffness: 220 });
  }, [focused, focusProgress, scale]);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [THEME.colors.dark, THEME.colors.primary]
    ),
    borderWidth: 1 + focusProgress.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => setFocused(true)}
      onPressOut={() => setFocused(false)}
      onPress={onPressInput}
    >
      <Animated.View style={[styles.searchBar, animStyle]}>
        <Ionicons name="search" size={20} color="#5A585A" style={{ marginRight: 8 }} />
        <View style={styles.searchInput}>
          <AppText variant="label" color={value ? THEME.colors.text : THEME.colors.muted}>
            {value || STRINGS.scam.searchPlaceholder}
          </AppText>
        </View>
        <View style={styles.micWrap}>
          <Ionicons name="mic" size={18} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Filter chip  ───────────────────────────── */

function FilterChip({ label, active, onPress }) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, progress]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [THEME.colors.subtle, THEME.colors.primary]
    ),
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.chip, animStyle]}>
        <AppText variant="caption" color={active ? THEME.colors.white : THEME.colors.text} style={styles.chipLabel}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Result card  ───────────────────────────── */

function ResultCard({ report, index, onPress }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);
  const stripHeight = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, 12) * 60;
    ty.value = withDelay(delay, withSpring(0, springs.default));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
    stripHeight.value = withDelay(
      delay + 100,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity, stripHeight]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));
  const stripStyle = useAnimatedStyle(() => ({
    height: `${stripHeight.value * 100}%`,
  }));

  const status = report.status ?? 'open';
  const badge = RISK_BADGE[status] ?? RISK_BADGE.open;
  const accent = STATUS_ACCENT[status] ?? THEME.colors.coral;
  const pillBg = STATUS_PILL_BG[status] ?? STATUS_PILL_BG.open;
  const pillFg = STATUS_PILL_TEXT[status] ?? STATUS_PILL_TEXT.open;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.View style={[styles.cardStrip, { backgroundColor: accent }, stripStyle]} />

        <View style={styles.cardHeader}>
          <AppText variant="label" numberOfLines={1} style={[{ flex: 1 }, styles.cardName]}>
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
          <View style={styles.footerStats}>
            <Ionicons name="document-text-outline" size={12} color="#5A585A" />
            <AppText variant="caption" color={THEME.colors.muted}>
              {report.complaintCount ?? 0} complaints
            </AppText>
            <AppText variant="caption" color={THEME.colors.muted}>·</AppText>
            <Ionicons name="star" size={12} color="#FBE74E" />
            <AppText variant="caption" color={THEME.colors.muted}>
              Score {report.reputationScore ?? 0}
            </AppText>
          </View>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <AppText variant="caption" color={pillFg} style={styles.statusPillText}>
              {status === 'open' ? 'Open' : status === 'resolved' ? 'Resolved' : 'Reviewing'}
            </AppText>
          </View>
          <AppText variant="caption" color={THEME.colors.muted}>{STRINGS.common.view}</AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  FAB  ───────────────────────────── */

function FAB({ onPress }) {
  const scale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 220 }));
    return () => cancelAnimation(scale);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pressScale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { pressScale.value = withSpring(0.92, { damping: 15, stiffness: 320 }); haptics.light(); }}
      onPressOut={() => { pressScale.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      onPress={onPress}
      style={styles.fabPositioner}
    >
      <Animated.View style={[styles.fab, animStyle]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Styles  ───────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 4,
    paddingBottom: THEME.spacing.sm,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    marginHorizontal: THEME.spacing.lg,
    paddingHorizontal: 24,
    borderRadius: 53,
    borderColor: THEME.colors.dark,
    borderWidth: 1,
    backgroundColor: THEME.colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.text,
    paddingVertical: 0,
  },
  micWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipScroller: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 13,
  },

  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },

  list: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 120,
    gap: THEME.spacing.md,
  },

  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
    paddingLeft: 25,
    gap: 6,
    overflow: 'hidden',
  },
  cardStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 5,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
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
  locationCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
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
    borderRadius: THEME.borderRadius.pill,
  },
  statusPillText: { fontSize: 10 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: THEME.spacing.xl,
  },

  fabPositioner: {
    position: 'absolute',
    right: THEME.spacing.lg,
    bottom: THEME.spacing.lg,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
});
