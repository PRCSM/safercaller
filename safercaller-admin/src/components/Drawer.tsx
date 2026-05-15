import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME } from '../lib/theme';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: ReactNode;
};

export default function Drawer({ open, onClose, title, width = 400, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={styles.backdrop}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ ...styles.drawer, width }}
          >
            <div style={styles.header}>
              <h2 style={styles.title}>{title ?? 'Details'}</h2>
              <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div style={styles.body}>{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)',
    zIndex: 90,
  },
  drawer: {
    position: 'fixed',
    right: 0, top: 0, bottom: 0,
    background: THEME.colors.white,
    boxShadow: '-12px 0 32px rgba(0,0,0,0.18)',
    zIndex: 91,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  title: { fontSize: 17, fontWeight: 600, margin: 0 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    fontSize: 16, color: THEME.colors.muted,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 24, overflowY: 'auto', flex: 1 },
};
