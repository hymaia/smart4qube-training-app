import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Native <dialog>, opened as a modal while mounted. */
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={ref} className="modal" onCancel={onClose} aria-label={title}>
      <header className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="modal-body">{message}</div>
      <footer className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className={`button ${danger ? "danger" : "primary"}`} onClick={onConfirm} disabled={busy}>
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </footer>
    </Modal>
  );
}
