import { motion } from 'framer-motion';
import { THEME } from '../lib/theme';
import { useCountUp } from '../hooks/useCountUp';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Tone = 'positive' | 'negative' | 'muted';

type Props = {
  label: string;
  value: number;
  delta?: string;
  deltaTone?: Tone;
  index?: number;
};

const TONE_COLOR: Record<Tone, string> = {
  positive: THEME.colors.primary,
  negative: THEME.colors.coral,
  muted:    THEME.colors.muted,
};

export default function StatCard({ label, value, delta, deltaTone = 'positive', index = 0 }: Props) {
  const reduced = useReducedMotion();
  const animated = useCountUp(value, 900);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      style={styles.card}
    >
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{animated.toLocaleString()}</div>
      {!!delta && (
        <div style={{ ...styles.delta, color: TONE_COLOR[deltaTone] }}>{delta}</div>
      )}
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: THEME.colors.surface,
    borderRadius: 18,
    border: `1px solid ${THEME.colors.border}`,
    padding: '20px 24px',
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    color: THEME.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 32,
    fontWeight: 600,
    marginTop: 6,
    fontVariantNumeric: 'tabular-nums',
  },
  delta: {
    fontSize: 12,
    marginTop: 2,
  },
};
