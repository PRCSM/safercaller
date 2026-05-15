import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';
import { registerToastContainer } from '../../utils/toast';

/**
 * Top-of-screen toast stack.
 *
 *   • Position:    top 48 px, horizontal margin 16 px (literal per spec —
 *                  on notched devices this can sit over the status bar;
 *                  swap to insets.top + 8 if that bothers you).
 *   • Entrance:    translateY -80 → slot + opacity 0 → 1
 *                  via withSpring({ damping: 20, stiffness: 220 }).
 *   • Exit:        translateY → -80 + opacity → 0 over 280 ms timing,
 *                  triggered by (a) auto-dismiss at 3000 ms or
 *                  (b) upward swipe with velocityY < -500 or
 *                  translationY < -30.
 *   • Queue:       max 2 toasts. A 3rd push instantly drops the oldest
 *                  (no exit animation for the evicted one).
 *   • Stack order: newest at top. Older slides down to slot index 1.
 */

const TYPE_COLORS = {
  success: THEME.colors.success,
  error:   THEME.colors.coral,
  warning: THEME.colors.warning,
  info:    THEME.colors.primary,
};

const ENTRANCE_SPRING = { damping: 20, stiffness: 220 };
const EXIT_DURATION = 280;
const AUTO_DISMISS_MS = 3000;
const SLOT_HEIGHT = 80;          // vertical distance between toast tops
const HIDDEN_Y = -80;            // off-screen entrance/exit position
const SWIPE_VELOCITY = -500;     // upward swipe trigger
const SWIPE_TRANSLATION = -30;   // upward distance trigger

function ToastItem({ id, type, title, subtitle, index, onDismiss }) {
  const targetY = index * SLOT_HEIGHT;
  const translateY = useSharedValue(HIDDEN_Y);
  const opacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  // Enter / reposition when index changes (e.g. queue reorder).
  useEffect(() => {
    translateY.value = withSpring(targetY, ENTRANCE_SPRING);
    opacity.value = withSpring(1, ENTRANCE_SPRING);
  }, [targetY, translateY, opacity]);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(HIDDEN_Y, { duration: EXIT_DURATION });
    opacity.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
      if (finished) runOnJS(onDismiss)(id);
    });
  }, [id, onDismiss, translateY, opacity]);

  // Auto-dismiss timer.
  useEffect(() => {
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [dismiss]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      // Only allow dragging upward (we're dismissing, not reordering).
      if (e.translationY < 0) {
        translateY.value = dragStartY.value + e.translationY;
        opacity.value = Math.max(0, 1 + e.translationY / 80);
      }
    })
    .onEnd((e) => {
      const fastSwipe = e.velocityY < SWIPE_VELOCITY;
      const farEnough = e.translationY < SWIPE_TRANSLATION;
      if (fastSwipe || farEnough) {
        translateY.value = withTiming(HIDDEN_Y, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)(id);
        });
      } else {
        translateY.value = withSpring(targetY, ENTRANCE_SPRING);
        opacity.value = withSpring(1, ENTRANCE_SPRING);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.toast,
          { borderLeftColor: TYPE_COLORS[type] ?? THEME.colors.primary },
          animStyle,
        ]}
      >
        <AppText variant="caption" style={styles.title}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="caption" color={THEME.colors.muted} style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    registerToastContainer({
      show: ({ type, title, subtitle }) => {
        idCounter.current += 1;
        const id = `toast-${idCounter.current}`;
        setToasts((prev) => {
          // Cap at 2. New toast appended; oldest dropped instantly.
          const next = [...prev, { id, type, title, subtitle }];
          return next.length > 2 ? next.slice(next.length - 2) : next;
        });
      },
    });
    return () => registerToastContainer(null);
  }, []);

  // Render newest on top (visual stack), oldest below.
  // `toasts` is chronological — reverse so the latest gets index 0.
  const stack = toasts.slice().reverse();

  return (
    <View style={styles.container} pointerEvents="box-none">
      {stack.map((t, i) => (
        <ToastItem
          key={t.id}
          id={t.id}
          type={t.type}
          title={t.title}
          subtitle={t.subtitle}
          index={i}
          onDismiss={remove}
        />
      ))}
    </View>
  );
}

export default ToastContainer;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 9998,
    elevation: 9998,
  },
  toast: {
    position: 'absolute',
    top: 0,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
