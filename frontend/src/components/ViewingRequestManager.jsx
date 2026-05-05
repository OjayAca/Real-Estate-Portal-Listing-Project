import { useState, useEffect, useCallback } from 'react';
import { 
  CalendarDays, 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  RefreshCcw,
  User,
  Home,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import InlineMessage from './InlineMessage';

export default function ViewingRequestManager({ authFetch }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch('/agent/viewing-requests');
      setRequests(data.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load viewing requests');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId, status, confirmedDate = null, confirmedTime = null, agentNotes = '') => {
    setActionBusy(requestId);
    try {
      const body = { status };
      if (confirmedDate) body.confirmed_date = confirmedDate;
      if (confirmedTime) body.confirmed_time = confirmedTime;
      if (agentNotes) body.agent_notes = agentNotes;

      const response = await authFetch(`/agent/viewing-requests/${requestId}`, {
        method: 'PATCH',
        body,
      });

      setSuccess(response.message);
      fetchRequests();
      setExpandedId(null);
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setActionBusy(null);
    }
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'Not scheduled';
    const d = new Date(date);
    return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at ${time || 'TBD'}`;
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-warning';
      case 'confirmed': return 'status-success';
      case 'rescheduled': return 'status-accent';
      case 'cancelled': return 'status-danger';
      default: return 'status-default';
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="section-panel animate-enter">
        <div className="flex-row" style={{ justifyContent: 'center', padding: '3rem' }}>
          <RefreshCcw size={24} className="animate-spin" style={{ color: 'var(--brand-base)' }} />
          <span>Synchronizing viewing requests...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="section-panel viewing-manager animate-enter">
      <div className="agent-manager-header">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <CalendarDays size={14} aria-hidden="true" /> Appointments
          </p>
          <h2>Viewing Requests</h2>
          <p className="agent-manager-copy">
            Manage viewing requests from prospective buyers for your listings.
          </p>
        </div>
        <span className="property-status status-new">{requests.filter(r => r.status === 'pending').length} pending</span>
      </div>

      <InlineMessage message={error} tone="error" onDismiss={() => setError('')} />
      <InlineMessage message={success} tone="success" onDismiss={() => setSuccess('')} />

      {requests.length === 0 ? (
        <p className="empty-copy">
          <CalendarDays size={22} aria-hidden="true" />
          No viewing requests found.
        </p>
      ) : (
        <div className="viewing-requests-list">
          {requests.map((request) => (
            <div 
              key={request.viewing_request_id} 
              className={`viewing-request-card ${expandedId === request.viewing_request_id ? 'is-expanded' : ''}`}
            >
              <div className="viewing-request-main" onClick={() => setExpandedId(expandedId === request.viewing_request_id ? null : request.viewing_request_id)}>
                <div className="viewing-request-info">
                  <div className="viewing-request-property">
                    <Home size={16} aria-hidden="true" />
                    <strong>{request.property.title}</strong>
                    <span className="property-loc">
                      <MapPin size={12} aria-hidden="true" />
                      {request.property.city}
                    </span>
                  </div>
                  <div className="viewing-request-buyer">
                    <User size={16} aria-hidden="true" />
                    <span>{request.buyer.full_name}</span>
                  </div>
                  <div className="viewing-request-schedule">
                    <Clock size={16} aria-hidden="true" />
                    <span>{formatDateTime(request.requested_date, request.requested_time)}</span>
                  </div>
                </div>
                <div className="viewing-request-meta">
                  <span className={`property-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                  {expandedId === request.viewing_request_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {expandedId === request.viewing_request_id && (
                <div className="viewing-request-details animate-enter">
                  <div className="details-content">
                    <div className="buyer-message">
                      <p className="eyebrow"><MessageSquare size={12} /> Buyer Note</p>
                      <p>{request.buyer_message || 'No message provided.'}</p>
                    </div>
                    
                    {request.agent_notes && (
                      <div className="agent-notes">
                        <p className="eyebrow">My Notes</p>
                        <p>{request.agent_notes}</p>
                      </div>
                    )}

                    {request.status !== 'cancelled' && (
                      <ActionForm 
                        request={request} 
                        isBusy={actionBusy === request.viewing_request_id}
                        onUpdate={handleUpdateStatus} 
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionForm({ request, onUpdate, isBusy }) {
  const [mode, setMode] = useState(null); // 'confirm', 'reschedule', 'cancel'
  const [date, setDate] = useState(request.requested_date || '');
  const [time, setTime] = useState(request.requested_time || '');
  const [notes, setNotes] = useState(request.agent_notes || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'confirm') {
      onUpdate(request.viewing_request_id, 'Confirmed', request.requested_date, request.requested_time, notes);
    } else if (mode === 'reschedule') {
      onUpdate(request.viewing_request_id, 'Rescheduled', date, time, notes);
    } else if (mode === 'cancel') {
      onUpdate(request.viewing_request_id, 'Cancelled', null, null, notes);
    }
  };

  if (!mode) {
    return (
      <div className="action-buttons">
        {request.status !== 'confirmed' && (
          <button className="primary-button btn-small" onClick={() => setMode('confirm')}>
            <CheckCircle size={14} /> Confirm Appointment
          </button>
        )}
        <button className="ghost-button btn-small" onClick={() => setMode('reschedule')}>
          <RefreshCcw size={14} /> {request.status === 'confirmed' ? 'Reschedule' : 'Propose New Time'}
        </button>
        <button className="danger-button btn-small" onClick={() => setMode('cancel')}>
          <XCircle size={14} /> Cancel Request
        </button>
      </div>
    );
  }

  return (
    <form className="mini-action-form animate-enter" onSubmit={handleSubmit}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>
          {mode === 'confirm' ? 'Confirm Appointment' : mode === 'reschedule' ? 'Reschedule Appointment' : 'Cancel Appointment'}
        </h4>
        {mode === 'confirm' && (
          <div className="flex-row" style={{ gap: '1rem', fontSize: '0.9rem', color: 'var(--brand-base)', fontWeight: 500 }}>
            <span className="flex-row" style={{ gap: '0.3rem' }}><CalendarDays size={14} /> {new Date(request.requested_date).toLocaleDateString()}</span>
            <span className="flex-row" style={{ gap: '0.3rem' }}><Clock size={14} /> {request.requested_time}</span>
          </div>
        )}
      </div>
      
      {mode === 'reschedule' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label-premium">New Date</label>
            <input 
              type="date" 
              className="premium-input"
              required 
              min={new Date().toISOString().split('T')[0]} 
              value={date} 
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label-premium">New Time</label>
            <input 
              type="time" 
              className="premium-input"
              required 
              value={time} 
              onChange={e => setTime(e.target.value)} 
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label-premium">
          {mode === 'cancel' ? 'Cancellation Reason' : 'Message to Buyer'}
        </label>
        <textarea 
          className="premium-input"
          placeholder={mode === 'cancel' ? "Briefly explain why the viewing is cancelled..." : "Add a message or additional instructions for the buyer..."}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="action-buttons">
        <button className={mode === 'cancel' ? 'danger-button' : 'primary-button'} type="submit" disabled={isBusy}>
          {isBusy ? 'Processing...' : mode === 'confirm' ? 'Confirm' : mode === 'reschedule' ? 'Send New Time' : 'Cancel Request'}
        </button>
        <button className="ghost-button" type="button" onClick={() => setMode(null)} disabled={isBusy}>
          Go Back
        </button>
      </div>
    </form>
  );
}
