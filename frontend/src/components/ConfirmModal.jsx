import { useEffect, useRef } from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';

const toneConfig = {
  danger: { color: '#ff4d4d', bg: 'rgba(255, 60, 60, 0.1)', border: 'rgba(255, 60, 60, 0.2)', Icon: Trash2 },
  warning: { color: 'var(--brand-base)', bg: 'rgba(197, 168, 128, 0.1)', border: 'rgba(197, 168, 128, 0.2)', Icon: AlertTriangle },
};

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', tone = 'danger' }) {
  const confirmRef = useRef(null);
  const config = toneConfig[tone] || toneConfig.warning;
  const ToneIcon = config.Icon;

  // Focus the confirm button when opened for keyboard accessibility
  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
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
          className="text-button"
          onClick={onCancel}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
          aria-label="Close modal"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: config.bg, padding: '1.25rem', borderRadius: '50%', marginBottom: '1.5rem', color: config.color, border: `1px solid ${config.border}` }}>
            <ToneIcon size={32} aria-hidden="true" />
          </div>

          <h2 id="confirm-title" style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '0.5rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '2rem', fontWeight: 300, fontSize: '0.95rem' }}>{message}</p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button className="ghost-button" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>
              Cancel
            </button>
            <button
              ref={confirmRef}
              className="primary-button"
              style={{ flex: 1, justifyContent: 'center', backgroundColor: config.color, borderColor: config.color }}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
