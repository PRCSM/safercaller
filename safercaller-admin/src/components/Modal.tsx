import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME } from '../lib/theme';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
  children: ReactNode;
};

export default function Modal({ open, onClose, title, maxWidth = 600, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={styles.backdrop}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{ ...styles.modal, maxWidth }}
          >
            {title && (
              <div style={styles.header}>
                <h2 style={styles.title}>{title}</h2>
                <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
              </div>
            )}
            <div style={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 20,
  },
  modal: {
    background: THEME.colors.white,
    borderRadius: 24,
    boxShadow: '0 16px 64px rgba(0,0,0,0.25)',
    maxHeight: '90vh',
    width: '100%',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${THEME.colors.subtle}`,
  },
  title: { fontSize: 18, fontWeight: 600, margin: 0 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    fontSize: 16, color: THEME.colors.muted,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 24, overflowY: 'auto' },
};
