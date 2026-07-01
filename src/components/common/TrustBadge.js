import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppText } from './AppText';
import { getTrustTier } from '../../utils/trust';

/**
 * TrustBadge — compact risk pill (soft-tinted) for lists and cards.
 *
 * Colour + icon come from the trust spectrum so risk never relies on colour
 * alone. Feed it either a numeric `score` (derives the tier) or an explicit
 * `tier` ('safe' | 'caution' | 'danger') plus a custom `label`.
 *
 * Props:
 *   score   0–1000 — derives tier + default label when `tier` not given
 *   tier    force a tier key, ignoring score
 *   label   override the text (e.g. "HIGH RISK", "RESOLVED", "REVIEWING")
 *   size    'md' (default) | 'sm'
 */
const FORCED = {
  safe: { color: THEME.colors.trust.safe, soft: THEME.colors.trust.safeSoft, text: THEME.colors.trust.safeText, icon: 'shield-checkmark', label: 'Safe' },
  caution: { color: THEME.colors.trust.caution, soft: THEME.colors.trust.cautionSoft, text: THEME.colors.trust.cautionText, icon: 'shield-half', label: 'Caution' },
  danger: { color: THEME.colors.trust.danger, soft: THEME.colors.trust.dangerSoft, text: THEME.colors.trust.dangerText, icon: 'warning', label: 'High risk' },
};

export function TrustBadge({ score, tier, label, size = 'md', style }) {
  const meta = tier ? FORCED[tier] ?? FORCED.caution : getTrustTier(score);
  const sm = size === 'sm';
  const text = label ?? meta.label;

  return (
    <View
      style={[
        styles.base,
        sm ? styles.sm : styles.md,
        { backgroundColor: meta.soft },
        style,
      ]}
      accessible
      accessibilityLabel={`Risk level: ${text}`}
    >
      <Ionicons name={meta.icon} size={sm ? 11 : 13} color={meta.color} />
      <AppText
        variant={sm ? 'overline' : 'caption'}
        color={meta.text}
        style={styles.text}
      >
        {text}
      </AppText>
    </View>
  );
}

export default TrustBadge;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: THEME.borderRadius.pill,
  },
  md: { height: 26, paddingHorizontal: 10 },
  sm: { height: 20, paddingHorizontal: 8 },
  text: {
    fontFamily: THEME.typography.fontFamily.semibold,
    letterSpacing: 0.3,
  },
});
