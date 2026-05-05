import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

function getPropertyLabel(property) {
  return [
    property?.address_line || property?.title,
    property?.city,
    property?.province,
  ].filter(Boolean).join(', ');
}

function createInitialForm(user, property) {
  const propertyLabel = getPropertyLabel(property);

  return {
    buyer_name: user?.full_name || '',
    buyer_email: user?.email || '',
    buyer_phone: user?.phone || '',
    message: propertyLabel
      ? `I'm interested in ${propertyLabel}.`
      : "I'm interested in this property.",
    served_military: false,
  };
}

export default function AgentInquiryModal({ property, onClose, onMessage }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => createInitialForm(user, property));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstFieldRef = useRef(null);
  const closeRef = useRef(null);

  const propertyLabel = useMemo(() => getPropertyLabel(property), [property]);
  const canSubmit = user?.role === 'user';

  useEffect(() => {
    if (!property) return;

    setForm(createInitialForm(user, property));
    setError('');
  }, [property, user]);

  useEffect(() => {
    if (!property) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key !== 'Tab') return;

      const focusable = [closeRef.current, ...Array.from(document.querySelectorAll('[data-inquiry-modal-focus]'))]
        .filter(Boolean)
        .filter((element) => !element.disabled);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [property, onClose]);

  const updateField = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const submitInquiry = async (event) => {
    event.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Log in as a buyer to email an agent.');
      return;
    }

    if (!form.buyer_name.trim() || !form.buyer_email.trim() || !form.buyer_phone.trim()) {
      setError('Full name, email, and phone are required.');
      return;
    }

    if (!form.message.trim() || form.message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }

    setBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/inquiries`, {
        method: 'POST',
        body: {
          buyer_name: form.buyer_name,
          buyer_email: form.buyer_email,
          buyer_phone: form.buyer_phone,
          message: form.message,
        },
      });
      if (onMessage) onMessage('Your inquiry has been sent to the agent.');
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Unable to send inquiry right now.');
    } finally {
      setBusy(false);
    }
  };

  if (!property) return null;

  return (
    <div
      className="agent-inquiry-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-inquiry-title"
      onClick={onClose}
    >
      <form className="agent-inquiry-modal animate-enter" onSubmit={submitInquiry} onClick={(event) => event.stopPropagation()}>
        <div className="agent-inquiry-header">
          <h2 id="agent-inquiry-title">More about this property</h2>
          <button
            ref={closeRef}
            className="agent-inquiry-close"
            type="button"
            onClick={onClose}
            aria-label="Close inquiry form"
          >
            <X size={30} aria-hidden="true" />
          </button>
        </div>

        {property.featured_image ? (
          <img
            className="agent-inquiry-image"
            src={property.featured_image}
            alt={propertyLabel ? `View of ${propertyLabel}` : `View of ${property.title}`}
            loading="lazy"
          />
        ) : (
          <div className="agent-inquiry-image agent-inquiry-image-empty">
            Image not available
          </div>
        )}

        <div className="agent-inquiry-fields">
          <label className="agent-inquiry-field">
            <span className="sr-only">Full name</span>
            <input
              ref={firstFieldRef}
              data-inquiry-modal-focus
              name="buyer_name"
              value={form.buyer_name}
              onChange={updateField}
              placeholder="Full name *"
              autoComplete="name"
            />
          </label>

          <label className="agent-inquiry-field">
            <span>Email *</span>
            <input
              data-inquiry-modal-focus
              name="buyer_email"
              type="email"
              value={form.buyer_email}
              onChange={updateField}
              placeholder="Email *"
              autoComplete="email"
            />
          </label>

          <label className="agent-inquiry-field">
            <span className="sr-only">Phone</span>
            <input
              data-inquiry-modal-focus
              name="buyer_phone"
              value={form.buyer_phone}
              onChange={updateField}
              placeholder="Phone *"
              autoComplete="tel"
            />
          </label>

          <label className="agent-inquiry-field">
            <span>How can an agent help?</span>
            <textarea
              data-inquiry-modal-focus
              name="message"
              value={form.message}
              onChange={updateField}
              rows={3}
            />
          </label>
        </div>

        {error ? <p className="agent-inquiry-error">{error}</p> : null}

        <button className="agent-inquiry-submit" data-inquiry-modal-focus type="submit" disabled={busy}>
          {busy ? 'Sending...' : 'Email agent'}
        </button>
      </form>
    </div>
  );
}
