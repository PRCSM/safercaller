import { THEME } from '../constants/theme';

/**
 * Trust score model — the single source of truth for turning a 0–1000
 * reputation score into a tier, colour, label, and icon.
 *
 * Replaces the ad-hoc `tierFor` helpers that were duplicated (with slightly
 * different thresholds and colours) across DialerScreen, PeopleSearchScreen,
 * ClassifiedsFeedScreen, etc.
 *
 * Thresholds:
 *   safe    → score >= 700   (reputable / verified / low risk)
 *   caution → 400–699        (unknown / mixed history)
 *   danger  → score < 400    (reported / flagged / high risk)
 */
export const TRUST_THRESHOLDS = Object.freeze({ safe: 700, caution: 400 });

const { trust } = THEME.colors;

const TIERS = Object.freeze({
  safe: Object.freeze({
    key: 'safe',
    label: 'Trusted',
    color: trust.safe,
    soft: trust.safeSoft,
    text: trust.safeText,
    icon: 'shield-checkmark',
  }),
  caution: Object.freeze({
    key: 'caution',
    label: 'Neutral',
    color: trust.caution,
    soft: trust.cautionSoft,
    text: trust.cautionText,
    icon: 'shield-half',
  }),
  danger: Object.freeze({
    key: 'danger',
    label: 'High risk',
    color: trust.danger,
    soft: trust.dangerSoft,
    text: trust.dangerText,
    icon: 'warning',
  }),
});

/**
 * @param {number} score 0–1000
 * @returns {{key,label,color,soft,text,icon}} tier metadata
 */
export function getTrustTier(score) {
  const s = typeof score === 'number' ? score : 0;
  if (s >= TRUST_THRESHOLDS.safe) return TIERS.safe;
  if (s >= TRUST_THRESHOLDS.caution) return TIERS.caution;
  return TIERS.danger;
}

/** Clamp a raw score into the valid 0–1000 range. */
export const clampScore = (n) => Math.max(0, Math.min(1000, Math.round(n || 0)));

export default getTrustTier;
