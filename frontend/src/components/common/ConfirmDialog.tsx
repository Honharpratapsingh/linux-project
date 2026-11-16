import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Textarea } from './Textarea';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  confirmClassName?: string;
  loading?: boolean;
  requireMessage?: boolean;
  showMessageInput?: boolean;
  messageLabel?: string;
  messagePlaceholder?: string;
  onConfirm: (message?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  confirmClassName,
  loading = false,
  requireMessage = false,
  showMessageInput = false,
  messageLabel = 'Message',
  messagePlaceholder = 'Enter details...',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setMessage('');
      setMessageError('');

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showMessageInput && requireMessage && !message.trim()) {
      setMessageError('Message is required.');
      return;
    }
    onConfirm(message.trim() || undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 animate-fade-in"
    >
      <div
        ref={dialogRef}
        className="card-hard-static bg-white border-2 border-ink rounded-[12px] shadow-[7px_7px_0_0_#1B1410] max-w-md w-full p-6 text-left"
      >
        <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-marigold text-ink">
          CONFIRMATION
        </span>
        <h3 id="dialog-title" className="font-display font-black text-2xl text-ink mb-2 tracking-tight">
          {title}
        </h3>
        <p id="dialog-description" className="font-sans text-sm text-text-secondary mb-4 leading-relaxed">
          {description}
        </p>

        <form onSubmit={handleSubmit}>
          {showMessageInput && (
            <div className="mb-4">
              <Textarea
                label={messageLabel}
                placeholder={messagePlaceholder}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (messageError) setMessageError('');
                }}
                error={messageError}
                rows={3}
                required={requireMessage}
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-ink">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              loading={loading}
              disabled={Boolean(showMessageInput && requireMessage && !message.trim())}
              className={confirmClassName}
            >
              {confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
