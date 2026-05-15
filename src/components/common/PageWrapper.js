import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Screen entrance wrapper.
 *
 * On mount: translateY 16 → 0 + opacity 0 → 1 over 300 ms after a 50 ms delay,
 * using Easing.out(Easing.cubic). The shared values reset on each mount, so
 * navigating away and back replays the animation cleanly.
 *
 * Usage:
 *   export default function MyScreen() {
 *     return (
 *       <PageWrapper>
 *         ...screen content...
 *       </PageWrapper>
 *     );
 *   }
 *
 * Pass `style` to layer on layout styles (backgroundColor, padding, etc.);
 * the default is `flex: 1` so PageWrapper fills the navigator's screen slot.
 */
export function PageWrapper({ children, style }) {
  const translateY = useSharedValue(16);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const config = { duration: 300, easing: Easing.out(Easing.cubic) };
    translateY.value = withDelay(50, withTiming(0, config));
    opacity.value = withDelay(50, withTiming(1, config));
  }, [translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

export default PageWrapper;
