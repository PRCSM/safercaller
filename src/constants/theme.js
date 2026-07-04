/**
 * SAFERCALLER design tokens.
 *
 * Single source of truth for colors, typography, spacing, radius, elevation,
 * and component sizes. Import via `import { THEME } from '../constants/theme';`.
 *
 * DESIGN DIRECTION — "Calm confidence at the moment of the call."
 *   SaferCaller helps a person decide whether to trust an unknown number.
 *   The interface stays steady and reassuring; the Trust Score is the
 *   signature element, expressed through the shared TrustRing motif and the
 *   `trust` colour spectrum (safe / caution / danger) below.
 *
 * Rules:
 *   - Spacing values come from the 4-px scale only — never inline a number.
 *   - Prefer semantic tokens (colors.primary, colors.trust.*, colors.textMuted)
 *     over raw hex at the call site. Raw hex in screens is being migrated out.
 *   - Primary CTA is THEME.colors.primary (electric blue #0066FF).
 *   - Body copy uses `medium` (500); display / headings use `semibold` (600).
 */
export const THEME = Object.freeze({
  /**
   * Color palette. Hex strings, no opacity. Use rgba() inline at the call
   * site when transparency is needed.
   */
  colors: Object.freeze({
    /** Primary CTA — electric blue (brand anchor). */
    primary: '#0066FF',
    /** Hover state for primary CTA — ~20% darker. */
    primaryHover: '#0052CC',
    /** Active/pressed state for primary CTA — ~40% darker. */
    primaryActive: '#003D99',

    /**
     * Tonal blue ramp. Use these for tints, surfaces, and depth of the brand
     * colour instead of hand-mixing rgba() at each call site.
     *   50/100  → soft tint backgrounds (selected chip, info banner)
     *   200/300 → borders and dividers on brand surfaces
     *   500     → the brand colour (=== primary)
     *   600/700 → hover / active / text-on-tint
     */
    blue50:  '#EAF2FF',
    blue100: '#D6E4FF',
    blue200: '#AECBFF',
    blue300: '#7FA9FF',
    blue400: '#4D86FF',
    blue500: '#0066FF',
    blue600: '#0052CC',
    blue700: '#003D99',
    blue800: '#002E73',
    blue900: '#001F4D',

    /**
     * Trust spectrum — the app's signature semantic axis. Every "how safe is
     * this?" surface (TrustRing, risk badges, caller cards, safety pills)
     * derives its colour from here. Each level pairs a strong colour, a soft
     * tint background, and a readable on-tint text colour so meaning never
     * relies on colour alone (always pair with an icon or label).
     */
    trust: Object.freeze({
      safe:        '#12905A', // reputable / verified / resolved
      safeSoft:    '#E4F5EC',
      safeText:    '#0B6B41',
      caution:     '#B9761A', // unknown / mixed / reviewing
      cautionSoft: '#FBF0DD',
      cautionText: '#8A5710',
      danger:      '#D93A3F', // reported / flagged / high risk
      dangerSoft:  '#FCE9EA',
      dangerText:  '#A32529',
    }),

    /** Secondary dark button background; also default heavy border. */
    dark: '#0F0F0F',
    white: '#FFFFFF',
    /** Default page background. */
    background: '#FFFFFF',

    /** Card / container surface. */
    surface: '#F9FAF9',
    /** Slightly deeper surface for nested / pressed containers. */
    surfaceAlt: '#F1F3F1',
    /** Subtle fill — icon-button bg, nav pills, inactive chips. */
    subtle: '#ECEFEC',

    /**
     * Neutral ink ramp for text and iconography. Prefer these named roles
     * over raw greys so contrast is consistent and tunable.
     *   textPrimary   → headings & body on light (AA: 20:1 on white)
     *   textSecondary → supporting copy (AA: 5.7:1 on white)
     *   textMuted     → metadata / hints (AA: ~4.6:1 on white — large/again bold)
     *   textDisabled  → disabled labels (decorative only, never sole meaning)
     */
    textPrimary:   '#0B0B0C',
    textSecondary: '#48474A',
    textMuted:     '#6B6A6D',
    textDisabled:  '#A6A6A9',

    /** Default body text on light backgrounds (legacy alias → textPrimary). */
    text: '#000000',
    /** Secondary text / metadata / placeholder (legacy alias). */
    muted: '#5A585A',

    /** Light divider / standard input border. */
    border: '#D1D6D2',
    /** Hairline divider for low-emphasis separation. */
    hairline: '#E7EAE7',
    /** Heavy border — large pill inputs, primary outlines. */
    borderDark: '#0F0F0F',

    /** Accent — illustration shapes, soft card tints. */
    accentBlue: '#9DC4F5',
    /** Danger / scam-flag accent (legacy alias → trust.danger family). */
    coral: '#FF5A4D',
    /** Warning / caution highlight (legacy alias → trust.caution family). */
    warning: '#FBE74E',
    /** Success state (legacy alias → trust.safe family). */
    success: '#22C55E',
    /** Focus ring on inputs and interactive controls. */
    focusCyan: '#24A3E3',
    focusRing: '#0066FF',
  }),

  /**
   * Typography. `fontFamily` keys map to the PostScript names registered via
   * expo-font in App.js. Sizes/lineHeights are unitless (density-independent
   * pixels). Pair every `size` with its matching `lineHeight` for rhythm.
   */
  typography: Object.freeze({
    fontFamily: Object.freeze({
      regular: 'TomatoGrotesk-Regular',
      medium: 'TomatoGrotesk-Medium',
      semibold: 'TomatoGrotesk-SemiBold',
    }),
    sizes: Object.freeze({
      xs: 10,
      sm: 12,     // nudged up from 11 for legible metadata
      base: 13,
      md: 14,
      lg: 16,
      xl: 18,
      title: 20,  // NEW — fills the gap for card titles / section heads
      xxl: 26,
      display: 44, // trimmed from 48 for better mobile fit
    }),
    /** Line heights keyed to `sizes`. RN lineHeight is absolute px. */
    lineHeights: Object.freeze({
      xs: 14,
      sm: 16,
      base: 18,
      md: 20,
      lg: 24,
      xl: 26,
      title: 28,
      xxl: 32,
      display: 48,
    }),
    /** Letter spacing roles. */
    letterSpacing: Object.freeze({
      tighter: -0.6,
      tight: -0.2,
      normal: 0,
      wide: 0.4,
      wider: 1.2,   // eyebrows / all-caps labels
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
    xs: 6,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 35,
    full: 9999,
  }),

  /**
   * Elevation presets. Flat by default; shadows are subtle and used only for
   * genuinely floating surfaces (call button, modals, FABs). Spread as
   * `...THEME.elevation.card` into a style object (includes iOS shadow* + Android elevation).
   */
  elevation: Object.freeze({
    none: Object.freeze({ elevation: 0 }),
    card: Object.freeze({
      shadowColor: '#0B0B0C',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }),
    raised: Object.freeze({
      shadowColor: '#0B0B0C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
    }),
    floating: Object.freeze({
      shadowColor: '#0B0B0C',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 12,
    }),
  }),

  /** Fixed component sizes — heights for buttons, inputs, icon buttons, tab bar. */
  sizes: Object.freeze({
    buttonHeight: 53,
    inputLarge: 88,
    inputStandard: 48,
    iconButton: 44,   // bumped from 40 to meet the 44pt touch-target minimum
    minTouch: 44,     // NEW — accessibility floor for any tappable control
    tabBarHeight: 70,
  }),
});

export default THEME;
