import { Text } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * Typed text primitive — the single way to render text in the app.
 *
 * Variants map to (fontFamily, fontSize, lineHeight, letterSpacing) from THEME:
 *   display  → SemiBold, 44/48   (hero / brand wordmark)
 *   heading  → SemiBold, 26/32   (screen + section headers)
 *   title    → SemiBold, 20/28   (card titles, list group heads)   [NEW]
 *   body     → Medium,   16/24   (paragraph copy)
 *   label    → Medium,   14/20   (buttons, form labels, tabs)
 *   caption  → Medium,   12/16   (metadata, hints, helper text)
 *   overline → Medium,   10/14   (all-caps eyebrows, wide-tracked) [NEW]
 *
 * Color defaults to THEME.colors.textPrimary. Pass `color="..."` to override,
 * or any `style` to override per-instance (style wins, so existing screens
 * that set their own fontSize/lineHeight keep working unchanged).
 */
const { sizes, lineHeights, letterSpacing, fontFamily } = THEME.typography;

const VARIANT_STYLES = {
  display: {
    fontFamily: fontFamily.semibold,
    fontSize: sizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: letterSpacing.tight,
  },
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: sizes.xxl,
    lineHeight: lineHeights.xxl,
    letterSpacing: letterSpacing.tight,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: sizes.title,
    lineHeight: lineHeights.title,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: sizes.lg,
    lineHeight: lineHeights.lg,
    letterSpacing: letterSpacing.normal,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: sizes.md,
    lineHeight: lineHeights.md,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: sizes.sm,
    lineHeight: lineHeights.sm,
    letterSpacing: letterSpacing.normal,
  },
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: sizes.xs,
    lineHeight: lineHeights.xs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },
};

export function AppText({ variant = 'body', color, style, children, ...rest }) {
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.body;
  return (
    <Text
      style={[
        { color: THEME.colors.textPrimary },
        variantStyle,
        color ? { color } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default AppText;
