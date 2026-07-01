import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';
import { getTrustTier, clampScore } from '../../utils/trust';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * TrustRing — the app's signature element.
 *
 * A circular reputation gauge whose colour derives from the trust spectrum
 * (safe / caution / danger). Reused everywhere a person or number is judged:
 * Dialer header, IncomingCall, People cards, Listing seller, Profile.
 *
 * Props:
 *   score       0–1000 reputation score (required)
 *   size        outer diameter in px (default 96)
 *   strokeWidth ring thickness (default size / 12)
 *   label       override the tier label ("Good"/"Fair"/"Low" on own score);
 *               pass null to hide the label row
 *   showIcon    show the tier icon next to the label (default true)
 *   showScore   show the numeric score in the centre (default true)
 *   animated    sweep the ring on mount (default true; auto-off on reduce motion)
 *   centerSlot  custom node rendered in the centre instead of score/label
 *   centerColor override colour for the score number (e.g. white on dark bg)
 *   trackColor  override the unfilled track colour (e.g. for dark surfaces)
 */
export function TrustRing({
  score,
  size = 96,
  strokeWidth,
  label,
  showIcon = true,
  showScore = true,
  animated = true,
  centerSlot,
  centerColor,
  trackColor,
}) {
  const reduceMotion = useReducedMotion();
  const value = clampScore(score);
  const tier = getTrustTier(value);
  const stroke = strokeWidth ?? Math.max(4, Math.round(size / 12));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const target = value / 1000;

  const progress = useSharedValue(animated && !reduceMotion ? 0 : target);

  useEffect(() => {
    if (animated && !reduceMotion) {
      progress.value = withTiming(target, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = target;
    }
  }, [target, animated, reduceMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const tierLabel = label === undefined ? tier.label : label;
  const scoreSize = Math.round(size * 0.3);

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Trust score ${value} out of 1000${tierLabel ? `, ${tierLabel}` : ''}`}
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor ?? THEME.colors.hairline}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc — starts at 12 o'clock */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tier.color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {centerSlot ?? (
          <>
            {showScore && (
              <AppText
                style={{
                  fontFamily: THEME.typography.fontFamily.semibold,
                  fontSize: scoreSize,
                  lineHeight: Math.round(scoreSize * 1.05),
                  color: centerColor ?? THEME.colors.textPrimary,
                }}
              >
                {value}
              </AppText>
            )}
            {tierLabel != null && (
              <View style={styles.labelRow}>
                {showIcon && (
                  <Ionicons
                    name={tier.icon}
                    size={Math.round(size * 0.11)}
                    color={tier.color}
                  />
                )}
                <AppText
                  style={{
                    fontFamily: THEME.typography.fontFamily.semibold,
                    fontSize: Math.max(10, Math.round(size * 0.12)),
                    color: tier.color,
                  }}
                >
                  {tierLabel}
                </AppText>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default TrustRing;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
