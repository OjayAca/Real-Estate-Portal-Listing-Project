import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, User, X } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ContactAgentModal({ agent, onClose, onMessage }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: `Hi ${agent.full_name}, I would love to learn more about how you can help me buy or sell a home.`,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const firstFieldRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!form.message.trim() || form.message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }

    setBusy(true);
    try {
      await apiRequest(`/agents/${agent.agent_id}/inquiries`, {
        method: 'POST',
        body: form,
      });
      if (onMessage) onMessage(`Your message has been sent to ${agent.full_name}.`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="agent-inquiry-overlay" onClick={onClose}>
      <div
        className="agent-inquiry-modal contact-agent-modal"
        onClick={e => e.stopPropagation()}
        ref={modalRef}
      >
        <div className="agent-inquiry-header">
          <h2>Contact {agent.full_name}</h2>
          <button className="agent-inquiry-close" onClick={onClose} aria-label="Close modal">
            <X size={32} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="contact-fields-stack">
            <div className="contact-input-group">
              <input
                ref={firstFieldRef}
                placeholder="Full name*"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required
              />
              <User className="contact-input-icon" size={24} />
            </div>

            <div className="contact-input-group">
              <input
                type="email"
                placeholder="Email*"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <Mail className="contact-input-icon" size={24} />
            </div>

            <div className="contact-input-group">
              <input
                placeholder="Phone*"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
              />
              <Phone className="contact-input-icon" size={24} />
            </div>

            <div className="contact-textarea-group">
              <label>How can the agent help?</label>
              <textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                rows={5}
              />
            </div>
          </div>

          {error && <p className="agent-inquiry-error">{error}</p>}

          <div className="contact-modal-actions">
            <button type="button" onClick={onClose} className="contact-cancel-btn">
              Cancel
            </button>
            <button
              type="submit"
              className="contact-send-btn"
              disabled={busy}
            >
              {busy ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
