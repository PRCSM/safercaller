import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { THEME } from '../../constants/theme';

/**
 * Skeleton loading primitives.
 *
 * A skeleton is a placeholder rectangle/circle filled with
 * THEME.colors.subtle (#ECEFEC) with a moving lighter sweep across it.
 * Implementation:
 *   - A View clips overflow and holds the base color.
 *   - An absolutely-positioned Animated.View wraps a LinearGradient
 *     that sweeps horizontally from -screenWidth → +screenWidth on a
 *     1200 ms linear loop.
 *
 * The composed variants below (CardSkeleton, RowSkeleton, …) are just
 * View layouts of SkeletonBox / SkeletonCircle — each child runs its
 * own shimmer loop. The 1200 ms duration is identical so they appear
 * synchronized on first paint.
 *
 * Use SkeletonSwap to cross-fade between skeleton and real content
 * once data arrives.
 */

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHIMMER_DURATION = 1200;
const SHIMMER_COLORS = ['rgba(245,245,245,0)', '#F5F5F5', 'rgba(245,245,245,0)'];

function Shimmer({ width, height, borderRadius = THEME.borderRadius.sm, style }) {
  const tx = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: SHIMMER_DURATION,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [tx]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: THEME.colors.subtle,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
        <LinearGradient
          colors={SHIMMER_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Primitives
 * ────────────────────────────────────────────────────────────────────── */

export function SkeletonBox({ width, height, radius = THEME.borderRadius.sm, style }) {
  return <Shimmer width={width} height={height} borderRadius={radius} style={style} />;
}

export function SkeletonCircle({ size, style }) {
  return <Shimmer width={size} height={size} borderRadius={size / 2} style={style} />;
}

/* ──────────────────────────────────────────────────────────────────────
 * Composed variants
 * ────────────────────────────────────────────────────────────────────── */

/** Classifieds listing card: 140 image + 3 text lines. */
export function CardSkeleton({ style }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBox width="100%" height={140} radius={0} />
      <View style={styles.cardBody}>
        <SkeletonBox width="80%" height={14} />
        <SkeletonBox width="40%" height={12} />
        <SkeletonBox width="60%" height={12} />
      </View>
    </View>
  );
}

/** Call-log row: 44 circle + 2 lines + small right-aligned pill. */
export function RowSkeleton({ style }) {
  return (
    <View style={[styles.row, style]}>
      <SkeletonCircle size={44} />
      <View style={styles.rowBody}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={12} />
      </View>
      <SkeletonBox width={56} height={24} radius={THEME.borderRadius.pill} />
    </View>
  );
}

/** "More" tab profile card: 64 circle + 3 lines + 3 chips. */
export function ProfileCardSkeleton({ style }) {
  return (
    <View style={[styles.profileCard, style]}>
      <View style={styles.profileTop}>
        <SkeletonCircle size={64} />
        <View style={styles.profileText}>
          <SkeletonBox width="50%" height={16} />
          <SkeletonBox width="70%" height={12} />
          <SkeletonBox width={80} height={20} radius={THEME.borderRadius.pill} />
        </View>
      </View>
      <View style={styles.chipRow}>
        <SkeletonBox width={70} height={20} radius={THEME.borderRadius.pill} />
        <SkeletonBox width={70} height={20} radius={THEME.borderRadius.pill} />
        <SkeletonBox width={70} height={20} radius={THEME.borderRadius.pill} />
      </View>
    </View>
  );
}

/** Chat thread: 3 alternating pairs, varied widths. */
export function ChatBubbleSkeleton({ style }) {
  return (
    <View style={[styles.chat, style]}>
      <Bubble side="left"  widthPct="70%" />
      <Bubble side="right" widthPct="50%" />
      <Bubble side="left"  widthPct="55%" />
      <Bubble side="right" widthPct="75%" />
      <Bubble side="left"  widthPct="40%" />
      <Bubble side="right" widthPct="60%" />
    </View>
  );
}

function Bubble({ side, widthPct }) {
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: side === 'left' ? 'flex-start' : 'flex-end' },
      ]}
    >
      <SkeletonBox width={widthPct} height={40} radius={THEME.borderRadius.lg} />
    </View>
  );
}

/** Admin dashboard stat card: small label + big number + sub-label. */
export function StatCardSkeleton({ style }) {
  return (
    <View style={[styles.statCard, style]}>
      <SkeletonBox width="50%" height={11} />
      <SkeletonBox width="60%" height={32} radius={6} />
      <SkeletonBox width="40%" height={11} />
    </View>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Swap helper — cross-fades skeleton out / content in.
 * ────────────────────────────────────────────────────────────────────── */

/**
 * Usage:
 *   <SkeletonSwap loading={isLoading} skeleton={<CardSkeleton />}>
 *     <RealCard {...data} />
 *   </SkeletonSwap>
 *
 * Both children render at once; skeleton starts at opacity 1, content
 * at 0. When `loading` flips false, skeleton fades 1→0 over 200 ms
 * while content fades 0→1 over 300 ms (so content "settles in" after
 * the skeleton has cleared).
 *
 * The container's intrinsic size comes from the content layer, so
 * make sure your content renders something (an empty card frame, etc.)
 * even before data arrives.
 */
export function SkeletonSwap({ loading, skeleton, children, style }) {
  const skelOpacity = useSharedValue(loading ? 1 : 0);
  const contentOpacity = useSharedValue(loading ? 0 : 1);

  useEffect(() => {
    if (loading) {
      skelOpacity.value = withTiming(1, { duration: 200 });
      contentOpacity.value = withTiming(0, { duration: 200 });
    } else {
      skelOpacity.value = withTiming(0, { duration: 200 });
      contentOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [loading, skelOpacity, contentOpacity]);

  const skelStyle = useAnimatedStyle(() => ({ opacity: skelOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return (
    <View style={style}>
      <Animated.View
        style={[StyleSheet.absoluteFill, skelStyle]}
        pointerEvents={loading ? 'auto' : 'none'}
      >
        {skeleton}
      </Animated.View>
      <Animated.View
        style={contentStyle}
        pointerEvents={loading ? 'none' : 'auto'}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default {
  SkeletonBox,
  SkeletonCircle,
  CardSkeleton,
  RowSkeleton,
  ProfileCardSkeleton,
  ChatBubbleSkeleton,
  StatCardSkeleton,
  SkeletonSwap,
};

/* ──────────────────────────────────────────────────────────────────────
 * Styles
 * ────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  cardBody: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: THEME.spacing.sm,
  },
  profileCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.xl,
    gap: THEME.spacing.md,
  },
  profileTop: {
    flexDirection: 'row',
    gap: THEME.spacing.lg,
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
    gap: THEME.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  chat: {
    gap: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.xl,
    gap: THEME.spacing.md,
  },
});
