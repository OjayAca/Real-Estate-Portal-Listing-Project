import { useState, useEffect, useCallback } from 'react';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Home, 
  CheckCircle,
  XCircle, 
  RefreshCcw,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import InlineMessage from './InlineMessage';

export default function BuyerViewingRequests({ authFetch }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionBusy, setActionBusy] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch('/viewing-requests');
      setRequests(data.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load your viewing requests');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancel = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this viewing request?')) return;
    
    setActionBusy(requestId);
    try {
      const response = await authFetch(`/viewing-requests/${requestId}/cancel`, {
        method: 'PATCH',
      });
      setSuccess(response.message);
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionBusy(null);
    }
  };

  const formatDateTime = (date, time) => {
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
      <div className="section-panel animate-enter" style={{ marginTop: '2rem' }}>
        <div className="flex-row" style={{ justifyContent: 'center', padding: '2rem' }}>
          <RefreshCcw size={20} className="animate-spin" />
          <span>Loading your appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="viewing-requests-section animate-enter" style={{ marginTop: '3rem' }}>
      <section className="section-panel">
        <div className="section-header-row">
          <div>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <CalendarDays size={14} aria-hidden="true" /> My Appointments
            </p>
            <h2>Viewing Requests</h2>
          </div>
          <span className="result-count">{requests.length} total</span>
        </div>

        <InlineMessage message={error} tone="error" onDismiss={() => setError('')} />
        <InlineMessage message={success} tone="success" onDismiss={() => setSuccess('')} />

        {requests.length === 0 ? (
          <div className="empty-copy">
            <CalendarDays size={22} aria-hidden="true" />
            <p>You haven't requested any property viewings yet.</p>
          </div>
        ) : (
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', marginTop: '1.5rem' }}>
            {requests.map((request) => (
              <div key={request.viewing_request_id} className="request-card">
                <div className="request-card-header">
                  <div className="request-property-info">
                    <Home size={18} />
                    <div>
                      <h4>{request.property.title}</h4>
                      <p className="property-loc"><MapPin size={12} /> {request.property.city}, {request.property.province}</p>
                    </div>
                  </div>
                  <span className={`property-status ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="request-card-body">
                  <div className="request-meta-item" style={{ 
                    color: (request.status === 'Confirmed' || request.status === 'Rescheduled') ? 'var(--brand-base)' : 'inherit',
                    fontWeight: (request.status === 'Confirmed' || request.status === 'Rescheduled') ? 600 : 400
                  }}>
                    <Clock size={16} />
                    <span>
                      {(request.status === 'Confirmed' || request.status === 'Rescheduled') && request.confirmed_date
                        ? `Scheduled: ${formatDateTime(request.confirmed_date, request.confirmed_time)}`
                        : `Requested: ${formatDateTime(request.requested_date, request.requested_time)}`
                      }
                    </span>
                  </div>

                  {request.buyer_message && (
                    <div className="request-message">
                      <p className="eyebrow"><MessageSquare size={10} /> My Note</p>
                      <p>{request.buyer_message}</p>
                    </div>
                  )}

                  {request.agent_notes && (
                    <div className="agent-response">
                      <p className="eyebrow">Agent Response</p>
                      <p>{request.agent_notes}</p>
                    </div>
                  )}
                </div>

                {request.status !== 'cancelled' && (
                  <div className="request-card-footer">
                    <button 
                      className="danger-button btn-small" 
                      onClick={() => handleCancel(request.viewing_request_id)}
                      disabled={actionBusy === request.viewing_request_id}
                    >
                      {actionBusy === request.viewing_request_id ? 'Cancelling...' : 'Cancel Request'}
                    </button>
                    {request.status === 'confirmed' && (
                      <div className="confirmation-badge">
                        <CheckCircle size={14} /> Confirmed by Agent
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
