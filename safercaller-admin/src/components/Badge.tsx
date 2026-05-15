import { ReactNode } from 'react';
import { THEME } from '../lib/theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: 'rgba(0,102,255,0.12)', fg: THEME.colors.primary },
  success: { bg: 'rgba(34,197,94,0.15)', fg: THEME.colors.success },
  warning: { bg: 'rgba(251,231,78,0.45)', fg: THEME.colors.text },
  danger:  { bg: 'rgba(255,90,77,0.12)',  fg: THEME.colors.coral },
  muted:   { bg: THEME.colors.subtle,      fg: THEME.colors.muted },
};

export default function Badge({ tone = 'muted', children }: { tone?: BadgeTone; children: ReactNode }) {
  const c = TONE[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 35,
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  );
}
