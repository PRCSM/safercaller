import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { AppText } from '../components/common/AppText';
import { haptics } from '../constants/animations';
import { useChatStore } from '../store/chatStore';

/**
 * Custom tab bar for React Navigation.
 *
 * Layout:
 *   • Bar: height 70 px + safe-area bottom inset, white bg,
 *     1 px top border in THEME.colors.border.
 *   • One pill (10 % primary fill, radius 12) translates horizontally
 *     to sit behind the active tab. Spring damping 20 / stiffness 200.
 *
 * Per-tab state:
 *   • Active   → icon color primary, icon scale 1.12, label visible.
 *   • Inactive → icon color muted,   icon scale 1.00, label hidden.
 *   • Transitions: spring on scale, timing on color / label opacity.
 *
 * Per-tab press signature (fires on tap regardless of focus change):
 *   Dialer   → rotate −15° → 0° (spring)
 *   Recents  → rotate 0° → 8° → 0° (200 ms each)
 *   Scam     → scale 1 → 1.15 → 1 (spring)
 *   Listings → opacity 1 → 0.5 → 1 (timing)
 *   More     → scale 1 → 1.15 → 1 (snappier spring)
 *
 * Badge: any tab whose `options.tabBarBadge` is truthy renders a small
 * coral dot top-right. Scale 0 → 1 spring on appear, 1 → 0 timing on
 * disappear.
 */

const TAB_COUNT = 5;
const PILL_MARGIN = 8; // horizontal gap between pill edge and tab edge
const PILL_SPRING = { damping: 20, stiffness: 200 };
const ICON_SCALE_SPRING = { damping: 18, stiffness: 200 };
const LABEL_SPRING = { damping: 20, stiffness: 220 };

const TAB_ICONS = {
  DialerTab:   { active: 'keypad',            inactive: 'keypad-outline' },
  RecentsTab:  { active: 'time',              inactive: 'time-outline' },
  ScamTab:     { active: 'shield-checkmark',  inactive: 'shield-outline' },
  ListingsTab: { active: 'grid',              inactive: 'grid-outline' },
  MoreTab:     { active: 'menu',              inactive: 'menu-outline' },
};

export function AnimatedTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const tabWidth = useSharedValue(0);
  const pillX = useSharedValue(0);
  const unreadCount = useChatStore((s) => s.unreadCount);

  // When the active tab changes, slide the pill to the new slot.
  useEffect(() => {
    if (tabWidth.value > 0) {
      pillX.value = withSpring(state.index * tabWidth.value, PILL_SPRING);
    }
  }, [state.index, tabWidth, pillX]);

  const onContainerLayout = (e) => {
    const w = e.nativeEvent.layout.width / TAB_COUNT;
    tabWidth.value = w;
    // Initial snap — no spring on first layout.
    pillX.value = state.index * w;
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value + PILL_MARGIN }],
    width: tabWidth.value > 0 ? tabWidth.value - PILL_MARGIN * 2 : 0,
    opacity: tabWidth.value > 0 ? 1 : 0,
  }));

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom }]}
      onLayout={onContainerLayout}
    >
      <Animated.View style={[styles.pill, pillStyle]} pointerEvents="none" />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Recents tab pulls its badge from chatStore. Other tabs honor
        // a per-screen `options.tabBarBadge` if one is set.
        const badge =
          route.name === 'RecentsTab' && unreadCount > 0
            ? unreadCount
            : options.tabBarBadge;

        return (
          <TabItem
            key={route.key}
            routeName={route.name}
            label={options.title ?? route.name}
            isFocused={isFocused}
            badge={badge}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

export default AnimatedTabBar;

/* ──────────────────────────────────────────────────────────────────── */

function TabItem({ routeName, label, isFocused, onPress, badge }) {
  // Persistent (active vs inactive) state.
  const focusScale = useSharedValue(isFocused ? 1.12 : 1);
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const labelY = useSharedValue(isFocused ? 0 : 4);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0);

  // Transient (per-press) state.
  const pressScale = useSharedValue(1);
  const pressRotation = useSharedValue(0);
  const pressOpacity = useSharedValue(1);

  useEffect(() => {
    focusScale.value = withSpring(isFocused ? 1.12 : 1, ICON_SCALE_SPRING);
    focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    labelY.value = withSpring(isFocused ? 0 : 4, LABEL_SPRING);
    labelOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, focusScale, focusProgress, labelY, labelOpacity]);

  const handlePress = () => {
    haptics.light();
    triggerPressAnimation(routeName, { pressScale, pressRotation, pressOpacity });
    onPress();
  };

  const iconTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: focusScale.value * pressScale.value },
      { rotate: `${pressRotation.value}deg` },
    ],
    opacity: pressOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: labelY.value }],
    opacity: labelOpacity.value,
  }));

  const iconSet = TAB_ICONS[routeName];
  const iconName = iconSet
    ? (isFocused ? iconSet.active : iconSet.inactive)
    : 'ellipse-outline';
  const iconColor = isFocused ? THEME.colors.primary : THEME.colors.muted;

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconTransformStyle}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </Animated.View>

      <Animated.View style={labelStyle}>
        <AppText variant="caption" color={THEME.colors.primary} style={styles.label}>
          {label}
        </AppText>
      </Animated.View>

      {!!badge && <Badge count={badge} />}
    </Pressable>
  );
}

function triggerPressAnimation(routeName, { pressScale, pressRotation, pressOpacity }) {
  switch (routeName) {
    case 'DialerTab':
      pressRotation.value = withSequence(
        withTiming(-15, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 12, stiffness: 220 })
      );
      break;
    case 'RecentsTab':
      pressRotation.value = withSequence(
        withTiming(8, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) })
      );
      break;
    case 'ScamTab':
      pressScale.value = withSequence(
        withSpring(1.15, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 18, stiffness: 200 })
      );
      break;
    case 'ListingsTab':
      pressOpacity.value = withSequence(
        withTiming(0.5, { duration: 100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })
      );
      break;
    case 'MoreTab':
      pressScale.value = withSequence(
        withSpring(1.15, { damping: 10, stiffness: 260 }),
        withSpring(1, { damping: 18, stiffness: 200 })
      );
      break;
    default:
      break;
  }
}

/* ──────────────────────────────────────────────────────────────────── */

function Badge({ count }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (count) {
      cancelAnimation(scale);
      // Spring in, then loop a subtle pulse every 3 s: a 400 ms beat
      // followed by a 2600 ms hold so the cycle is exactly 3 s.
      scale.value = withSequence(
        withSpring(1, { damping: 15, stiffness: 250 }),
        withRepeat(
          withSequence(
            withTiming(1.1, { duration: 200 }),
            withTiming(1,   { duration: 200 }),
            withTiming(1,   { duration: 2600 })
          ),
          -1,
          false
        )
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0, { duration: 150 });
    }
  }, [count, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // count can be `true`, a number, or a string — show count if numeric.
  const text = typeof count === 'number' ? (count > 99 ? '99+' : String(count)) : null;

  return (
    <Animated.View style={[styles.badge, style]} pointerEvents="none">
      {text != null && (
        <AppText
          variant="caption"
          color={THEME.colors.white}
          style={styles.badgeText}
        >
          {text}
        </AppText>
      )}
    </Animated.View>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  pill: {
    position: 'absolute',
    top: 8,
    height: 54,
    backgroundColor: 'rgba(0,102,255,0.1)',
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '500',
    color: THEME.colors.muted,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: '25%',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: THEME.colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
});
