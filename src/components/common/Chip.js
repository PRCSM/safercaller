import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';

/**
 * Chip — filter pill / selectable tag.
 *
 * Selected state uses the brand tint (blue50 bg + blue600 text + blue200
 * border) rather than a flat fill, keeping contrast high and the look calm.
 *
 * Props:
 *   label     text (required)
 *   selected  active state (default false)
 *   onPress   toggle handler
 *   icon      optional Ionicons name shown before the label
 *   size      'md' (default) | 'sm'
 */
export function Chip({ label, selected = false, onPress, icon, size = 'md', style, ...rest }) {
  const sm = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        sm ? styles.sm : styles.md,
        selected ? styles.selected : styles.unselected,
        pressed && { opacity: 0.7 },
        style,
      ]}
      {...rest}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sm ? 12 : 14}
          color={selected ? THEME.colors.blue600 : THEME.colors.textSecondary}
        />
      )}
      <AppText
        variant={sm ? 'caption' : 'label'}
        color={selected ? THEME.colors.blue600 : THEME.colors.textSecondary}
        style={styles.text}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default Chip;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
  },
  md: { height: 36, paddingHorizontal: 14 },
  sm: { height: 28, paddingHorizontal: 10 },
  selected: {
    backgroundColor: THEME.colors.blue50,
    borderColor: THEME.colors.blue200,
  },
  unselected: {
    backgroundColor: THEME.colors.white,
    borderColor: THEME.colors.border,
  },
  text: { fontFamily: THEME.typography.fontFamily.semibold },
});
