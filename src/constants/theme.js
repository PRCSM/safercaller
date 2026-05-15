/**
 * SAFERCALLER design tokens.
 *
 * Single source of truth for colors, typography, spacing, radius, and
 * component sizes. Import via `import { THEME } from '../constants/theme';`.
 *
 * Rules:
 *   - Spacing values come from the 4-px scale only — never inline a number.
 *   - Primary CTA is THEME.colors.primary; secondary dark is THEME.colors.dark.
 *   - Body text weight is `medium` (500); display headings use `semibold` (600).
 */
export const THEME = Object.freeze({
  /**
   * Color palette. Hex strings, no opacity. Use rgba() inline at the call
   * site when transparency is needed.
   */
  colors: Object.freeze({
    /** Primary CTA — electric blue. */
    primary: '#0066FF',
    /** Hover state for primary CTA — ~20% darker. */
    primaryHover: '#0052CC',
    /** Active/pressed state for primary CTA — ~40% darker. */
    primaryActive: '#003D99',

    /** Secondary dark button background; also default heavy border. */
    dark: '#0F0F0F',
    white: '#FFFFFF',
    /** Default page background. */
    background: '#FFFFFF',

    /** Card / container surface. */
    surface: '#F9FAF9',
    /** Subtle fill — icon-button bg, nav pills, inactive chips. */
    subtle: '#ECEFEC',

    /** Default body text on light backgrounds. */
    text: '#000000',
    /** Secondary text / metadata / placeholder. */
    muted: '#5A585A',

    /** Light divider / standard input border. */
    border: '#D1D6D2',
    /** Heavy border — large pill inputs, primary outlines. */
    borderDark: '#0F0F0F',

    /** Accent — illustration shapes, soft card tints. */
    accentBlue: '#9DC4F5',
    /** Danger / scam-flag accent. */
    coral: '#FF5A4D',
    /** Warning / caution highlight. */
    warning: '#FBE74E',
    /** Success state (resolved, safe). */
    success: '#22C55E',
    /** Focus ring on inputs. */
    focusCyan: '#24A3E3',
  }),

  /**
   * Typography. `fontFamily` keys map to the PostScript names that will be
   * registered via expo-font in App.js bootstrap. Sizes are unitless numbers
   * (React Native uses density-independent pixels by default).
   */
  typography: Object.freeze({
    fontFamily: Object.freeze({
      regular: 'TomatoGrotesk-Regular',
      medium: 'TomatoGrotesk-Medium',
      semibold: 'TomatoGrotesk-SemiBold',
    }),
    sizes: Object.freeze({
      xs: 10,
      sm: 11,
      base: 13,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 26,
      display: 48,
    }),
  }),

  /**
   * 4-px spacing scale. Only these values are allowed in layouts —
   * intermediate numbers break vertical rhythm.
   */
  spacing: Object.freeze({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 32,
    huge: 44,
    giant: 60,
  }),

  /** Border-radius scale. `full` is a sentinel for fully-circular elements. */
  borderRadius: Object.freeze({
    sm: 8,
    md: 12,
    lg: 18,
    pill: 35,
    full: 9999,
  }),

  /** Fixed component sizes — heights for buttons, inputs, icon buttons, tab bar. */
  sizes: Object.freeze({
    buttonHeight: 53,
    inputLarge: 88,
    inputStandard: 48,
    iconButton: 40,
    tabBarHeight: 70,
  }),
});

export default THEME;
