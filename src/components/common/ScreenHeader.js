import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';

/**
 * ScreenHeader — consistent top bar for stacked (pushed / modal) screens.
 *
 * Left: back or close affordance (48px touch target). Center: title +
 * optional subtitle. Right: an optional action node.
 *
 * Props:
 *   title      screen title (required)
 *   subtitle   optional secondary line
 *   onBack     shows a back chevron and calls this on press
 *   onClose    shows a close (X) instead of back
 *   right      node rendered on the trailing side
 *   align      'left' (default) | 'center'
 */
export function ScreenHeader({ title, subtitle, onBack, onClose, right, align = 'left', style }) {
  const leading = onClose
    ? { icon: 'close', onPress: onClose, label: 'Close' }
    : onBack
      ? { icon: 'chevron-back', onPress: onBack, label: 'Go back' }
      : null;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.side}>
        {leading && (
          <Pressable
            onPress={leading.onPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={leading.label}
            style={styles.iconBtn}
          >
            <Ionicons name={leading.icon} size={22} color={THEME.colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <View style={[styles.center, align === 'left' && styles.centerLeft]}>
        <AppText variant="title" numberOfLines={1} style={align === 'center' && styles.centerText}>
          {title}
        </AppText>
        {subtitle != null && (
          <AppText variant="caption" color={THEME.colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

export default ScreenHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: THEME.spacing.md,
  },
  side: { minWidth: 44, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  center: { flex: 1, justifyContent: 'center' },
  centerLeft: { paddingLeft: THEME.spacing.xs },
  centerText: { textAlign: 'center' },
});
