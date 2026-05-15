import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { THEME } from '../../constants/theme';
import { haptics, springs } from '../../constants/animations';
import { AppText } from './AppText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VARIANT_BG = {
  primary:   THEME.colors.primary,
  secondary: THEME.colors.dark,
  ghost:     'transparent',
  icon:      THEME.colors.subtle,
};

const VARIANT_TEXT = {
  primary:   THEME.colors.white,
  secondary: THEME.colors.white,
  ghost:     THEME.colors.muted,
  icon:      THEME.colors.text,
};

const SIZE_STYLES = {
  default: {
    height: THEME.sizes.buttonHeight,
    paddingHorizontal: THEME.spacing.xxxl,
  },
  small: {
    height: 36,
    paddingHorizontal: THEME.spacing.lg,
  },
};

/**
 * Animated button primitive.
 *
 * Variants: 'primary' | 'secondary' | 'ghost' | 'icon'
 * Sizes:    'default' (53 h) | 'small' (36 h). Ignored for variant='icon'.
 *
 * State props:
 *   loading      — fade label out, show 3 bouncing dots
 *   disabled     — opacity → 0.4, swallow press
 *   showSuccess  — bg morphs to THEME.colors.success, label → "✓ Done",
 *                  spring bounce on scale
 *
 * Press feedback:
 *   scale 1 → 0.96 (snappy spring) + haptics.light() on pressIn;
 *   scale → 1 (default spring) on pressOut.
 *   For icon variant, a circular ripple expands and fades on press.
 *
 * Do not pass `transform` or `opacity` via `style` — those are driven by
 * the press / disabled animations and your override will fight them.
 */
export function Button({
  variant = 'primary',
  label,
  onPress,
  loading = false,
  disabled = false,
  showSuccess = false,
  size = 'default',
  leftIcon,
  rightIcon,
  style,
}) {
  const scale = useSharedValue(1);
  const bgProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const labelOpacity = useSharedValue(1);
  const rippleScale = useSharedValue(0.5);
  const rippleOpacity = useSharedValue(0);
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  const baseBg = VARIANT_BG[variant] ?? VARIANT_BG.primary;
  const textColor = VARIANT_TEXT[variant] ?? THEME.colors.text;
  const sizeStyle = variant === 'icon' ? null : SIZE_STYLES[size] ?? SIZE_STYLES.default;
  const pressBlocked = disabled || loading;

  // Disabled: fade container.
  useEffect(() => {
    containerOpacity.value = withTiming(disabled ? 0.4 : 1, { duration: 200 });
  }, [disabled, containerOpacity]);

  // Loading: hide label + start dot bounce. Cancel on cleanup so the
  // animation doesn't run forever after unmount.
  useEffect(() => {
    if (loading) {
      labelOpacity.value = withTiming(0, { duration: 150 });
      const startBounce = (sv, delayMs) => {
        sv.value = withDelay(
          delayMs,
          withRepeat(
            withSequence(
              withTiming(-6, { duration: 280 }),
              withTiming(0,  { duration: 280 })
            ),
            -1,
            true
          )
        );
      };
      startBounce(dot1Y, 0);
      startBounce(dot2Y, 120);
      startBounce(dot3Y, 240);
    } else {
      labelOpacity.value = withTiming(1, { duration: 150 });
      cancelAnimation(dot1Y); dot1Y.value = withTiming(0);
      cancelAnimation(dot2Y); dot2Y.value = withTiming(0);
      cancelAnimation(dot3Y); dot3Y.value = withTiming(0);
    }
    return () => {
      cancelAnimation(dot1Y);
      cancelAnimation(dot2Y);
      cancelAnimation(dot3Y);
    };
  }, [loading, labelOpacity, dot1Y, dot2Y, dot3Y]);

  // Success: bg morph + scale bounce.
  useEffect(() => {
    if (showSuccess) {
      bgProgress.value = withTiming(1, { duration: 250 });
      scale.value = withSequence(
        withSpring(1.04, springs.snappy),
        withSpring(1,    springs.default)
      );
    } else {
      bgProgress.value = withTiming(0, { duration: 250 });
    }
  }, [showSuccess, bgProgress, scale]);

  const handlePressIn = () => {
    if (pressBlocked) return;
    scale.value = withSpring(0.96, springs.snappy);
    haptics.light();
    if (variant === 'icon') {
      rippleScale.value = 0.5;
      rippleOpacity.value = 0.2;
      rippleScale.value   = withTiming(1.5, { duration: 400 });
      rippleOpacity.value = withTiming(0,   { duration: 400 });
    }
  };

  const handlePressOut = () => {
    if (pressBlocked) return;
    scale.value = withSpring(1, springs.default);
  };

  const handlePress = () => {
    if (pressBlocked) return;
    onPress?.();
  };

  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: containerOpacity.value,
    backgroundColor: interpolateColor(
      bgProgress.value,
      [0, 1],
      [baseBg, THEME.colors.success]
    ),
  }));

  const labelAnim = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const rippleAnim = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const showDots = loading && variant !== 'icon';

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={pressBlocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: pressBlocked, busy: loading }}
      style={[
        styles.base,
        variant === 'icon' ? styles.iconLayout : sizeStyle,
        containerAnim,
        style,
      ]}
    >
      {variant === 'icon' && (
        <Animated.View pointerEvents="none" style={[styles.ripple, rippleAnim]} />
      )}

      {leftIcon}

      {label != null && (
        <Animated.View style={labelAnim}>
          <AppText variant="label" color={textColor}>
            {showSuccess ? '✓ Done' : label}
          </AppText>
        </Animated.View>
      )}

      {showDots && (
        <View style={styles.dotsOverlay} pointerEvents="none">
          <Dot tY={dot1Y} color={textColor} />
          <Dot tY={dot2Y} color={textColor} />
          <Dot tY={dot3Y} color={textColor} />
        </View>
      )}

      {rightIcon}
    </AnimatedPressable>
  );
}

function Dot({ tY, color }) {
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: tY.value }],
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, anim]} />;
}

export default Button;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.pill,
    gap: THEME.spacing.sm,
    overflow: 'hidden',
  },
  iconLayout: {
    width: THEME.sizes.iconButton,
    height: THEME.sizes.iconButton,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 0,
  },
  ripple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.dark,
    borderRadius: THEME.borderRadius.full,
  },
  dotsOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
