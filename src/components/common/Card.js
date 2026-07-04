import { View, Pressable, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * Card — the standard surface container.
 *
 * Flat by default (border, no shadow) to match the calm, low-elevation
 * aesthetic. Pass `elevated` for a subtle floating shadow, or `onPress` to
 * make it an accessible pressable.
 *
 * Props:
 *   variant   'surface' (default) | 'plain' (white) | 'tint' (custom bg via `tint`)
 *   padding   spacing token key (default 'lg') or a number
 *   radius    borderRadius token key (default 'lg') or a number
 *   bordered  draw the hairline border (default true)
 *   elevated  add THEME.elevation.card shadow (default false)
 *   tint      background colour when variant='tint'
 *   onPress   makes the card a Pressable with press feedback
 */
export function Card({
  children,
  variant = 'surface',
  padding = 'lg',
  radius = 'lg',
  bordered = true,
  elevated = false,
  tint,
  onPress,
  style,
  ...rest
}) {
  const bg =
    variant === 'plain' ? THEME.colors.white
    : variant === 'tint' ? (tint ?? THEME.colors.blue50)
    : THEME.colors.surface;

  const pad = typeof padding === 'number' ? padding : (THEME.spacing[padding] ?? THEME.spacing.lg);
  const rad = typeof radius === 'number' ? radius : (THEME.borderRadius[radius] ?? THEME.borderRadius.lg);

  const cardStyle = [
    {
      backgroundColor: bg,
      padding: pad,
      borderRadius: rad,
    },
    bordered && { borderWidth: 1, borderColor: THEME.colors.hairline },
    elevated && THEME.elevation.card,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { backgroundColor: THEME.colors.surfaceAlt },
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

export default Card;

// eslint-disable-next-line no-unused-vars
const _styles = StyleSheet.create({});
