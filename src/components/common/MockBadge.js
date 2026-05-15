import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_MOCK } from '../../constants/config';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';

/**
 * Top-right yellow pill shown whenever IS_MOCK is true.
 * Lives above NavigationContainer so it survives screen transitions.
 * Pointer events are off so it never intercepts taps.
 */
export function MockBadge() {
  const insets = useSafeAreaInsets();
  if (!IS_MOCK) return null;
  return (
    <AppText
      variant="caption"
      pointerEvents="none"
      style={[styles.badge, { top: insets.top + 8 }]}
    >
      🔧 MOCK
    </AppText>
  );
}

export default MockBadge;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: THEME.colors.warning,
    color: THEME.colors.text,
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.pill,
    overflow: 'hidden',
  },
});
