import { CardStyleInterpolators } from '@react-navigation/stack';

/**
 * Screen-transition presets.
 *
 *   - `slideFromRight` / `slideFromBottom` are spread into
 *     `@react-navigation/native-stack` screens, which use the platform's
 *     native screen animator (fast, gesture-driven, but no custom
 *     interpolation).
 *
 *   - `fadeScale` is spread into `@react-navigation/stack` (JS-based)
 *     screens — it relies on `cardStyleInterpolator`, which native-stack
 *     does not support. The AuthStack uses the JS stack so this preset
 *     applies; everything else stays on native-stack.
 */

export const slideFromRight = {
  animation: 'slide_from_right',
  animationDuration: 280,
};

export const slideFromBottom = {
  animation: 'slide_from_bottom',
  animationDuration: 280,
  presentation: 'modal',
  gestureEnabled: true,
};

export const fadeScale = {
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
      transform: [
        {
          scale: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.94, 1],
          }),
        },
      ],
    },
  }),
  transitionSpec: {
    open: { animation: 'timing', config: { duration: 280 } },
    close: { animation: 'timing', config: { duration: 280 } },
  },
};
