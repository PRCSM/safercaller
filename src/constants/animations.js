import { Easing, withSpring, withTiming, withDelay, withRepeat, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export const springs = {
  gentle:  { damping:20, stiffness:120 },
  default: { damping:18, stiffness:180 },
  snappy:  { damping:15, stiffness:300 },
  bouncy:  { damping:10, stiffness:150 },
  stiff:   { damping:25, stiffness:400 },
};

export const durations = {
  instant:80, fast:180, default:280, slow:380, verySlow:500
};

export const easings = {
  out:   Easing.out(Easing.cubic),
  in:    Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  sharp: Easing.out(Easing.exp),
};

export const stagger = (index, base=50) => index * base;

export const haptics = {
  light:   () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
