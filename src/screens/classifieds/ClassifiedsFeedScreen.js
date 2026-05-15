import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedScrollHandler,
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
import { CardSkeleton } from '../../components/common/Skeleton';
import { classifiedsService } from '../../services';
import { useAuthStore } from '../../store/authStore';
import { useClassifiedsStore } from '../../store/classifiedsStore';
import { THEME } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { haptics, springs } from '../../constants/animations';
import { toast } from '../../utils/toast';

const CATEGORIES = [
  { id: 'all',         label: STRINGS.classifieds.chips.all },
  { id: 'Plumbing',    label: 'Plumbing' },
  { id: 'Electrical',  label: 'Electrical' },
  { id: 'Tutoring',    label: 'Tutoring' },
  { id: 'Vehicles',    label: 'Vehicles' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Furniture',   label: 'Furniture' },
];

const PLACEHOLDER_BG = [
  THEME.colors.accentBlue,
  'rgba(255,202,220,1)',   // soft pink
  THEME.colors.subtle,
  'rgba(167,203,246,1)',   // light blue
];

export default function ClassifiedsFeedScreen({ navigation }) {
  const profile = useAuthStore((s) => s.profile);
  const location = profile?.location ?? 'Chennai';

  const listings = useClassifiedsStore((s) => s.listings);
  const setListings = useClassifiedsStore((s) => s.setListings);
  const activeFilters = useClassifiedsStore((s) => s.filters);
  const setStoreFilters = useClassifiedsStore((s) => s.setFilters);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(activeFilters?.category ?? 'all');
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });

  const fetchListings = useCallback(async () => {
    try {
      const filters = {};
      if (activeCategory !== 'all') filters.category = activeCategory;
      if (location) filters.location = location;
      const { results } = await classifiedsService.getListings(filters);
      setListings(results);
      setStoreFilters({ category: activeCategory, location });
    } catch (err) {
      toast.error('Could not load listings', err?.message ?? '');
    }
  }, [activeCategory, location, setListings, setStoreFilters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await fetchListings();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchListings]);

  const onRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await fetchListings();
    setRefreshing(false);
  };

  const onCategoryPress = (cat) => {
    haptics.light();
    setActiveCategory(cat);
  };

  const openListing = (listing) => {
    navigation.navigate('ListingDetail', { listingId: listing.id, listing });
  };

  const openCreate = () =>
    navigation.getParent()?.getParent()?.navigate('CreateListing')
      ?? navigation.navigate('CreateListing');

  /* ─────────────────  Mic / voice search  ───────────────── */

  const onMicPress = () => {
    if (isRecording) return;
    haptics.medium();
    setIsRecording(true);
    // Simulated record + transcribe pipeline. Real impl:
    //   1. expo-av.Audio.Recording.createAsync(...)
    //   2. Stop after silence detection or N seconds
    //   3. Upload .m4a to OpenAI Whisper /v1/audio/transcriptions
    //   4. Parse transcription → set query → trigger search
    setTimeout(() => {
      setIsRecording(false);
      const transcribed = 'AC repair';
      setQuery(transcribed);
      haptics.success();
      toast.info('Heard "AC repair"', 'Showing matching listings');
    }, 2000);
  };

  // Visible listings — filter by query string client-side for now
  // (the mock service ignores filters). Real impl would push query
  // into the server-side classifiedsService call.
  const visibleListings = query.trim()
    ? listings.filter((l) =>
        l.title?.toLowerCase().includes(query.trim().toLowerCase())
      )
    : listings;

  // Wrap into pairs for 2-column rendering.
  const pairs = (() => {
    const out = [];
    for (let i = 0; i < visibleListings.length; i += 2) {
      out.push([visibleListings[i], visibleListings[i + 1]]);
    }
    return out;
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <PageWrapper>
        <View style={styles.header}>
          <AppText variant="heading">{STRINGS.classifieds.feedTitle}</AppText>
          <Button
            variant="secondary"
            size="small"
            label={STRINGS.common.postPlus}
            onPress={openCreate}
          />
        </View>

        <SearchBar
          value={query}
          onChange={setQuery}
          focused={searchFocused}
          setFocused={setSearchFocused}
          isRecording={isRecording}
          onMicPress={onMicPress}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((c, i) => (
            <CategoryChip
              key={c.id}
              label={c.label}
              index={i}
              active={activeCategory === c.id}
              onPress={() => onCategoryPress(c.id)}
            />
          ))}
        </ScrollView>

        <View style={styles.locationRow}>
          <AppText variant="caption" style={styles.nearLabel}>
            {STRINGS.classifieds.nearYou} — {location}
          </AppText>
          <Pressable onPress={() => toast.info('Change location coming soon')} hitSlop={6}>
            <AppText variant="caption" color={THEME.colors.primary}>
              {STRINGS.common.change}
            </AppText>
          </Pressable>
        </View>

        <Animated.FlatList
          data={loading ? Array(4).fill(null) : pairs}
          keyExtractor={(_, i) => `row-${i}`}
          contentContainerStyle={styles.list}
          onScroll={onScroll}
          scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={6}
          windowSize={5}
          initialNumToRender={4}
          renderItem={({ item, index }) => {
            if (loading) {
              return (
                <View style={styles.row}>
                  <View style={styles.col}><CardSkeleton /></View>
                  <View style={styles.col}><CardSkeleton /></View>
                </View>
              );
            }
            const [a, b] = item;
            return (
              <View style={styles.row}>
                <View style={styles.col}>
                  {a && (
                    <ListingCard
                      item={a}
                      index={index * 2}
                      scrollY={scrollY}
                      bgColor={PLACEHOLDER_BG[(index * 2) % PLACEHOLDER_BG.length]}
                      onPress={() => openListing(a)}
                    />
                  )}
                </View>
                <View style={styles.col}>
                  {b && (
                    <ListingCard
                      item={b}
                      index={index * 2 + 1}
                      scrollY={scrollY}
                      bgColor={PLACEHOLDER_BG[(index * 2 + 1) % PLACEHOLDER_BG.length]}
                      onPress={() => openListing(b)}
                    />
                  )}
                </View>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
              colors={[THEME.colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyWrap}>
                <AppText variant="caption" color={THEME.colors.muted}>
                  No listings match this filter.
                </AppText>
              </View>
            )
          }
        />
      </PageWrapper>
    </SafeAreaView>
  );
}

/* ─────────────────────────────  Search bar with mic pulse  ───────────────────────────── */

function SearchBar({ value, onChange, focused, setFocused, isRecording, onMicPress }) {
  const focusProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, focusProgress]);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.8, { duration: 900, easing: Easing.out(Easing.cubic) }),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 0 }),
          withTiming(0,   { duration: 900 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const barStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [THEME.colors.dark, THEME.colors.primary]
    ),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const micBg = isRecording ? THEME.colors.coral : THEME.colors.primary;

  return (
    <Animated.View style={[styles.searchBar, barStyle]}>
      <AppText variant="label" color={THEME.colors.muted} style={{ marginRight: 8 }}>🔍</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={STRINGS.classifieds.voicePlaceholder}
        placeholderTextColor={THEME.colors.muted}
        style={styles.searchInput}
        returnKeyType="search"
      />
      <Pressable onPress={onMicPress} hitSlop={6} disabled={isRecording}>
        <View style={styles.micWrap}>
          <Animated.View
            style={[styles.micRing, { backgroundColor: micBg }, ringStyle]}
            pointerEvents="none"
          />
          <View style={[styles.mic, { backgroundColor: micBg }]}>
            <AppText variant="caption" color={THEME.colors.white}>🎤</AppText>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─────────────────────────────  Category chip with right-stagger  ───────────────────────────── */

function CategoryChip({ label, index, active, onPress }) {
  const enterX = useSharedValue(40);
  const enterOpacity = useSharedValue(0);
  const colorProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    enterX.value = withDelay(
      index * 30,
      withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
    enterOpacity.value = withDelay(
      index * 30,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
  }, [index, enterX, enterOpacity]);

  useEffect(() => {
    colorProgress.value = withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 });
  }, [active, colorProgress]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enterX.value }],
    opacity: enterOpacity.value,
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [THEME.colors.subtle, THEME.colors.dark]
    ),
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.chip, chipStyle]}>
        <AppText variant="caption" color={active ? THEME.colors.white : THEME.colors.text}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

/* ─────────────────────────────  Listing card  ───────────────────────────── */

function ListingCard({ item, index, scrollY, bgColor, onPress }) {
  const ty = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index, 12) * 60;
    ty.value = withDelay(delay, withSpring(0, springs.default));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, [index, ty, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  // Global parallax — every image shifts proportionally to scroll position.
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.15 }],
  }));

  const typeBadge = item.type === 'service'
    ? { label: 'Service', bg: THEME.colors.dark, fg: THEME.colors.white }
    : { label: item.condition ?? 'New', bg: THEME.colors.warning, fg: THEME.colors.text };

  const safety =
    item.sellerScore > 500 ? { label: '🟢 Safe',    bg: 'rgba(0,102,255,0.1)',  fg: THEME.colors.primary }
    : item.sellerScore < 200 ? { label: '🔴 Flagged', bg: 'rgba(255,90,77,0.1)',  fg: THEME.colors.coral }
    : null;

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.cardImageWrap}>
          <Animated.View style={[styles.cardImage, { backgroundColor: bgColor }, imageStyle]}>
            {item.mediaUrls?.[0] ? (
              <Image source={{ uri: item.mediaUrls[0] }} style={StyleSheet.absoluteFill} />
            ) : (
              <AppText variant="caption" color={THEME.colors.muted}>
                {item.category}
              </AppText>
            )}
          </Animated.View>

          <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
            <AppText variant="caption" color={typeBadge.fg} style={styles.tinyText}>
              {typeBadge.label}
            </AppText>
          </View>

          {!!item.rating && (
            <View style={styles.ratingPill}>
              <AppText variant="caption" style={styles.tinyText}>⭐ {item.rating}</AppText>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <AppText variant="label" numberOfLines={1}>{item.title}</AppText>
          <AppText variant="caption" color={THEME.colors.primary}>
            ₹{item.price}{item.priceUnit ?? ''}
          </AppText>
          <AppText variant="caption" color={THEME.colors.muted} numberOfLines={1}>
            {item.location}
          </AppText>

          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <AppText variant="caption" color={THEME.colors.muted} style={styles.tinyText}>
                {(item.sellerName ?? 'U').slice(0, 1).toUpperCase()}
              </AppText>
            </View>
            <AppText variant="caption" color={THEME.colors.muted} numberOfLines={1} style={{ flex: 1 }}>
              {item.sellerName ?? 'Seller'}
            </AppText>
            {safety && (
              <View style={[styles.safetyPill, { backgroundColor: safety.bg }]}>
                <AppText variant="caption" color={safety.fg} style={styles.tinyText}>
                  {safety.label}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    marginHorizontal: THEME.spacing.lg,
    paddingHorizontal: 24,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: THEME.colors.dark,
    backgroundColor: THEME.colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.text,
    paddingVertical: 0,
  },
  micWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  chipRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },
  nearLabel: {
    fontWeight: '500',
    color: THEME.colors.text,
  },

  list: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  col: {
    flex: 1,
  },

  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.pill,
  },
  ratingPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.white,
  },
  tinyText: {
    fontSize: 10,
  },
  cardBody: {
    padding: 12,
    gap: 2,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sellerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.pill,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: THEME.spacing.huge,
  },
});
