import { Text } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * Typed text primitive — the single way to render text in the app.
 *
 * Variants map to (fontFamily, fontSize) pairs from THEME:
 *   display  → SemiBold, 48px   (hero / brand wordmark)
 *   heading  → Medium,   26px   (section headers, card titles)
 *   body     → Medium,   16px   (paragraph copy)
 *   label    → Medium,   14px   (buttons, form labels, tabs)
 *   caption  → Medium,   11px   (metadata, hints, helper text)
 *
 * Color defaults to THEME.colors.text. Pass `color="..."` to override,
 * or pass any style via `style` to override per-instance.
 */
const VARIANT_STYLES = {
  display: {
    fontFamily: THEME.typography.fontFamily.semibold,
    fontSize: THEME.typography.sizes.display,
  },
  heading: {
    fontFamily: THEME.typography.fontFamily.medium,
    fontSize: THEME.typography.sizes.xxl,
  },
  body: {
    fontFamily: THEME.typography.fontFamily.medium,
    fontSize: THEME.typography.sizes.lg,
  },
  label: {
    fontFamily: THEME.typography.fontFamily.medium,
    fontSize: THEME.typography.sizes.md,
  },
  caption: {
    fontFamily: THEME.typography.fontFamily.medium,
    fontSize: THEME.typography.sizes.sm,
  },
};

export function AppText({ variant = 'body', color, style, children, ...rest }) {
  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.body;
  return (
    <Text
      style={[
        { color: THEME.colors.text },
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
