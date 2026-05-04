import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

function inferTone(message) {
  if (!message) {
    return 'info';
  }

  if (/\b(log in|login|buyer account|pending review|suspended|unavailable)\b/i.test(message)) {
    return 'warning';
  }

  if (/\b(error|invalid|expired|unable|failed|review the highlighted|required|must be|could not|request failed)\b/i.test(message)) {
    return 'error';
  }

  if (/\b(saved|sent|submitted|received|updated|verified|enabled|disabled|removed|deleted|created|approved|restored)\b/i.test(message)) {
    return 'success';
  }

  return 'info';
}

export default function InlineMessage({
  autoDismissMs = 5000,
  className = '',
  icon,
  message,
  onDismiss,
  style,
  tone,
}) {
  const resolvedTone = tone || inferTone(message);
  const Icon = icon || toneIcons[resolvedTone] || toneIcons.info;
  const isError = resolvedTone === 'error';
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message || !onDismissRef.current || !autoDismissMs) {
      return undefined;
    }

    const timer = window.setTimeout(() => onDismissRef.current?.(), autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={`inline-message inline-message-${resolvedTone}${className ? ` ${className}` : ''}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      style={style}
    >
      <Icon className="inline-message-icon" size={18} aria-hidden="true" />
      <span>{message}</span>
      {onDismiss ? (
        <button
          className="icon-button inline-message-dismiss"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
