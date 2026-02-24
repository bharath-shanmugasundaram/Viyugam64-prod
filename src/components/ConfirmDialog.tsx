'use client';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content confirm-dialog">
                <h3 className="confirm-title">{title}</h3>
                <p className="confirm-message">{message}</p>
                <div className="modal-actions">
                    <button
                        className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
