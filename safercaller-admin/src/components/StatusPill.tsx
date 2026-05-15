import { AnimatePresence, motion } from 'framer-motion';
import { THEME } from '../lib/theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

export type Status = 'open' | 'resolved' | 'reviewing';

const STATUS_COLOR: Record<Status, { bg: string; fg: string }> = {
  open:      { bg: THEME.colors.warning,    fg: THEME.colors.text },
  resolved:  { bg: THEME.colors.primary,    fg: THEME.colors.white },
  reviewing: { bg: THEME.colors.accentBlue, fg: THEME.colors.text },
};

const STATUS_LABEL: Record<Status, string> = {
  open:      'Open',
  resolved:  'Resolved',
  reviewing: 'Reviewing',
};

export default function StatusPill({ status }: { status: Status }) {
  const reduced = useReducedMotion();
  const c = STATUS_COLOR[status];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: c.bg,
          color: c.fg,
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 35,
          letterSpacing: 0.3,
        }}
      >
        {STATUS_LABEL[status]}
      </motion.span>
    </AnimatePresence>
  );
}
