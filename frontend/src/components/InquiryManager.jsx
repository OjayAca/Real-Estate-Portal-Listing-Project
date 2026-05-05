import { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  User, 
  Home, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  RefreshCcw,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import InlineMessage from './InlineMessage';

export default function InquiryManager({ authFetch, isAdmin = false }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/admin/inquiries' : '/agent/inquiries';
      const data = await authFetch(endpoint);
      setInquiries(data.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [authFetch, isAdmin]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleUpdateStatus = async (inquiryId, status) => {
    setActionBusy(inquiryId);
    try {
      const response = await authFetch(`/agent/inquiries/${inquiryId}`, {
        method: 'PATCH',
        body: { status },
      });

      setSuccess(response.message);
      setInquiries(prev => prev.map(i => i.inquiry_id === inquiryId ? response.inquiry : i));
      setError('');
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setActionBusy(null);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'status-new';
      case 'contacted': return 'status-accent';
      case 'scheduled': return 'status-info';
      case 'closed': return 'status-success';
      case 'cancelled': return 'status-danger';
      case 'spam': return 'status-muted';
      default: return 'status-default';
    }
  };

  const filteredInquiries = filterStatus === 'all' 
    ? inquiries 
    : inquiries.filter(i => i.status.toLowerCase() === filterStatus.toLowerCase());

  if (loading && inquiries.length === 0) {
    return (
      <div className="section-panel animate-enter">
        <div className="flex-row" style={{ justifyContent: 'center', padding: '3rem' }}>
          <RefreshCcw size={24} className="animate-spin" style={{ color: 'var(--brand-base)' }} />
          <span>Syncing inquiries...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="section-panel inquiry-manager animate-enter">
      <div className="agent-manager-header">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <MessageSquare size={14} aria-hidden="true" /> Communications
          </p>
          <h2>Property Inquiries</h2>
          <p className="agent-manager-copy">
            Track and respond to potential buyers interested in your listings.
          </p>
        </div>
        
        <div className="flex-row" style={{ gap: '1rem', alignItems: 'center' }}>
          <div className="filter-wrapper">
            <Filter size={14} />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="premium-select-small"
            >
              <option value="all">All Inquiries</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="scheduled">Scheduled</option>
              <option value="closed">Closed</option>
              <option value="spam">Spam</option>
            </select>
          </div>
          <span className="property-status status-new">{inquiries.filter(i => i.status === 'New').length} new</span>
        </div>
      </div>

      <InlineMessage message={error} tone="error" onDismiss={() => setError('')} />
      <InlineMessage message={success} tone="success" onDismiss={() => setSuccess('')} />

      {filteredInquiries.length === 0 ? (
        <p className="empty-copy">
          <MessageSquare size={22} aria-hidden="true" />
          No {filterStatus !== 'all' ? filterStatus : ''} inquiries found.
        </p>
      ) : (
        <div className="inquiries-list">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.inquiry_id} 
              className={`inquiry-card ${expandedId === inquiry.inquiry_id ? 'is-expanded' : ''}`}
            >
              <div className="inquiry-main" onClick={() => setExpandedId(expandedId === inquiry.inquiry_id ? null : inquiry.inquiry_id)}>
                <div className="inquiry-info">
                  <div className="inquiry-buyer">
                    <User size={16} aria-hidden="true" />
                    <strong>{inquiry.buyer.name}</strong>
                  </div>
                  <div className="inquiry-property">
                    <Home size={16} aria-hidden="true" />
                    <span>{inquiry.property?.title || 'General Inquiry'}</span>
                  </div>
                  <div className="inquiry-date">
                    <Clock size={16} aria-hidden="true" />
                    <span>{new Date(inquiry.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="inquiry-meta">
                  <span className={`property-status ${getStatusClass(inquiry.status)}`}>
                    {inquiry.status}
                  </span>
                  {expandedId === inquiry.inquiry_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {expandedId === inquiry.inquiry_id && (
                <div className="inquiry-details animate-enter">
                  <div className="details-content">
                    <div className="buyer-contact-grid">
                      <div className="contact-item">
                        <p className="eyebrow"><Mail size={12} /> Email</p>
                        <a href={`mailto:${inquiry.buyer.email}`}>{inquiry.buyer.email}</a>
                      </div>
                      <div className="contact-item">
                        <p className="eyebrow"><Phone size={12} /> Phone</p>
                        <a href={`tel:${inquiry.buyer.phone}`}>{inquiry.buyer.phone}</a>
                      </div>
                    </div>

                    <div className="buyer-message">
                      <p className="eyebrow"><MessageSquare size={12} /> Message</p>
                      <p className="message-text">{inquiry.message}</p>
                    </div>

                    {!isAdmin && (
                      <div className="action-strip">
                        <p className="eyebrow">Update Status</p>
                        <div className="status-buttons">
                          <button 
                            className={`status-btn ${inquiry.status === 'Contacted' ? 'active' : ''}`}
                            onClick={() => handleUpdateStatus(inquiry.inquiry_id, 'Contacted')}
                            disabled={actionBusy === inquiry.inquiry_id}
                          >
                            <ShieldCheck size={14} /> Contacted
                          </button>
                          <button 
                            className={`status-btn ${inquiry.status === 'Scheduled' ? 'active' : ''}`}
                            onClick={() => handleUpdateStatus(inquiry.inquiry_id, 'Scheduled')}
                            disabled={actionBusy === inquiry.inquiry_id}
                          >
                            <RefreshCcw size={14} /> Scheduled
                          </button>
                          <button 
                            className={`status-btn ${inquiry.status === 'Closed' ? 'active' : ''}`}
                            onClick={() => handleUpdateStatus(inquiry.inquiry_id, 'Closed')}
                            disabled={actionBusy === inquiry.inquiry_id}
                          >
                            <CheckCircle size={14} /> Closed
                          </button>
                          <button 
                            className={`status-btn danger ${inquiry.status === 'Spam' ? 'active' : ''}`}
                            onClick={() => handleUpdateStatus(inquiry.inquiry_id, 'Spam')}
                            disabled={actionBusy === inquiry.inquiry_id}
                          >
                            <AlertTriangle size={14} /> Spam
                          </button>
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="admin-view-note">
                        <p className="eyebrow">Agent Assigned</p>
                        <p>{inquiry.agent?.full_name} ({inquiry.agent?.agency_name})</p>
                      </div>
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
