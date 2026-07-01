import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Returns `true` when the OS "Reduce Motion" accessibility setting is enabled.
 *
 * Use it to skip or shorten non-essential animation (looping pulses, parallax,
 * long entrances) for users who are motion-sensitive. Essential feedback
 * (a state change, a color swap) should still happen — just without the
 * decorative movement.
 *
 * Usage:
 *   const reduceMotion = useReducedMotion();
 *   useEffect(() => {
 *     if (reduceMotion) { progress.value = 1; return; }
 *     progress.value = withRepeat(withTiming(1, { duration: 2000 }), -1);
 *   }, [reduceMotion]);
 */
export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {
        /* default to motion on if the query fails */
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled),
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}

export default useReducedMotion;
