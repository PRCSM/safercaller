import Modal from './Modal';
import { THEME } from '../lib/theme';

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <h2 style={styles.title}>{title}</h2>
      {message && <p style={styles.message}>{message}</p>}
      <div style={styles.actions}>
        <button onClick={onClose} style={styles.cancel}>{cancelLabel}</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          style={{
            ...styles.confirm,
            background: destructive ? THEME.colors.coral : THEME.colors.primary,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8 },
  message: { fontSize: 14, color: THEME.colors.muted, marginTop: 0, marginBottom: 24, lineHeight: 1.5 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancel: {
    padding: '0 18px', height: 38, borderRadius: 35,
    border: `1px solid ${THEME.colors.border}`,
    background: THEME.colors.white,
    fontSize: 13, fontWeight: 500,
  },
  confirm: {
    padding: '0 18px', height: 38, borderRadius: 35,
    color: THEME.colors.white,
    fontSize: 13, fontWeight: 500,
  },
};
