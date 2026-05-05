import { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, MessageSquare } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function ViewingRequestModal({ property, onClose, onSuccess }) {
  // user is not used here but auth context might be needed for other things
  // in this case we don't even need useAuth if we are just using apiRequest
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    requested_date: '',
    requested_time: '',
    buyer_message: ''
  });

  const firstFieldRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!property) return;
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, requested_date: today }));
    setError('');
  }, [property]);

  useEffect(() => {
    if (!property) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [property, onClose]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.requested_date || !form.requested_time) {
      setError('Please select both a date and time.');
      return;
    }

    setBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/viewing-requests`, {
        method: 'POST',
        body: form,
      });
      if (onSuccess) onSuccess('Your viewing request has been submitted to the agent.');
      onClose();
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit viewing request.');
    } finally {
      setBusy(false);
    }
  };

  if (!property) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="modal-card modal-card-premium animate-enter" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-premium">
          <div className="flex-row" style={{ gap: '1rem', alignItems: 'center' }}>
            <div className="modal-icon-container">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="modal-title">Schedule a Viewing</h3>
              <p className="modal-subtext">Request a visit to {property.title}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form className="modal-body" onSubmit={submitRequest}>
          <div className="field-grid two-up">
            <label className="form-label-premium">
              <span className="flex-row" style={{ gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Calendar size={14} /> Preferred Date *
              </span>
              <input
                ref={firstFieldRef}
                className="premium-input"
                type="date"
                name="requested_date"
                min={todayStr}
                value={form.requested_date}
                onChange={updateField}
                required
              />
            </label>
            <label className="form-label-premium">
              <span className="flex-row" style={{ gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Clock size={14} /> Preferred Time *
              </span>
              <input
                className="premium-input"
                type="time"
                name="requested_time"
                value={form.requested_time}
                onChange={updateField}
                required
              />
            </label>
          </div>

          <label className="form-label-premium" style={{ marginTop: '1.5rem' }}>
            <span className="flex-row" style={{ gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <MessageSquare size={14} /> Message to Agent (Optional)
            </span>
            <textarea
              className="premium-input"
              name="buyer_message"
              value={form.buyer_message}
              onChange={updateField}
              placeholder="e.g. I am free all afternoon. I'm looking to move in next month."
              rows={4}
            />
          </label>

          {error && <p className="form-error-premium" style={{ marginTop: '1rem' }}>{error}</p>}

          <div className="modal-actions" style={{ marginTop: '2.5rem' }}>
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
