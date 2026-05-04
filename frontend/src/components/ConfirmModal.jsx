import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, LogOut, Trash2, X, CheckCircle } from 'lucide-react';

const toneConfig = {
  danger: { color: 'var(--status-danger)', bg: 'var(--status-danger)15', border: 'var(--status-danger)', Icon: Trash2 },
  warning: { color: 'var(--status-warning)', bg: 'var(--status-warning)15', border: 'var(--status-warning)', Icon: AlertTriangle },
  success: { color: 'var(--status-success)', bg: 'var(--status-success)15', border: 'var(--status-success)', Icon: CheckCircle },
};

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  tone = 'danger',
  showInput = false,
  inputPlaceholder = 'Reason...',
  inputLabel = 'Reason'
}) {
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);
  const closeRef = useRef(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const config = toneConfig[tone] || toneConfig.warning;
  const ToneIcon = config.Icon;

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  // Focus the correct element when opened
  useEffect(() => {
    if (isOpen) {
      if (showInput && inputRef.current) {
        inputRef.current.focus();
      } else if (confirmRef.current) {
        confirmRef.current.focus();
      }
    }
  }, [isOpen, showInput]);

  // Basic Focus Trap & Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }

      if (e.key === 'Tab') {
        const focusableElements = [closeRef.current, inputRef.current, cancelRef.current, confirmRef.current].filter(Boolean);
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
      style={{ alignItems: 'center', justifyContent: 'center', zIndex: 1000, display: 'flex' }}
    >
      <div
        className="section-panel animate-enter"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '90%', position: 'relative', boxShadow: 'var(--shadow-lg)', padding: '2.5rem 2rem' }}
      >
        <button
          ref={closeRef}
          className="icon-button"
          onClick={onCancel}
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: '32px', height: '32px' }}
          aria-label="Close modal"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: config.bg, padding: '1.25rem', borderRadius: '50%', marginBottom: '1.5rem', color: config.color, border: `1px solid ${config.border}` }}>
            <ToneIcon size={32} aria-hidden="true" />
          </div>

          <h2 id="confirm-title" style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '0.5rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: showInput ? '1.5rem' : '2rem', fontWeight: 300, fontSize: '0.95rem' }}>{message}</p>

          {showInput && (
            <div style={{ width: '100%', textAlign: 'left', marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                {inputLabel}
              </label>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button ref={cancelRef} className="ghost-button" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>
              Cancel
            </button>
            <button
              ref={confirmRef}
              className="primary-button"
              style={{ flex: 1, justifyContent: 'center', backgroundColor: config.color, borderColor: config.color }}
              onClick={() => onConfirm(inputValue)}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
