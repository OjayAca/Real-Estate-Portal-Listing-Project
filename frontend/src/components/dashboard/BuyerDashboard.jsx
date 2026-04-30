import { Save, Mail, CalendarDays } from 'lucide-react';

export default function BuyerDashboard({ 
  dashboard, 
  setSelectedProperty, 
  respondingInquiry, 
  setRespondingInquiry, 
  responseMessage, 
  setResponseMessage, 
  responseBusy, 
  handleBuyerInquiryReply 
}) {
  if (!dashboard) return null;

  return (
    <>
      <section className="section-panel animate-enter animate-delay-2">
        <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Save size={14} aria-hidden="true" /> Curated Collection</p>
        <h2>Saved Properties</h2>
        <div className="list-stack">
          {(dashboard.saved_properties || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>You haven't saved any properties yet.</p>}
          {(dashboard.saved_properties || []).map((property) => (
            <div 
              className="list-card" 
              key={property.property_id} 
              onClick={() => setSelectedProperty(property)}
              role="button"
              style={{ cursor: 'pointer' }}
            >
              <strong>{property.title}</strong>
              <span>{property.city}, {property.province}</span>
            </div>
          ))}
        </div>
      </section>
      
      <section className="section-panel animate-enter animate-delay-3">
        <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Mail size={14} aria-hidden="true" /> Communications</p>
        <h2>Inquiry History</h2>
        <div className="list-stack">
          {(dashboard.recent_inquiries || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>No recent inquiries.</p>}
          {(dashboard.recent_inquiries || []).map((entry) => (
             <div className="list-card" key={entry.inquiry_id}>
              <strong>{entry.property?.title}</strong>
              <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--brand-base)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', fontWeight: 500 }}>{entry.status}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(entry.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ margin: 0, fontWeight: 300, fontStyle: 'italic', color: 'var(--text-light)', lineHeight: 1.6 }}>"{entry.message}"</p>
              
              {entry.response_message && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-base)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-base)' }}>Response from Agent:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{entry.response_message}</p>
                  <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {entry.responded_at ? new Date(entry.responded_at).toLocaleString() : ''}
                  </span>
                </div>
              )}

              {entry.buyer_reply && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'right' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600 }}>Your Reply:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{entry.buyer_reply}</p>
                  <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {entry.buyer_replied_at ? new Date(entry.buyer_replied_at).toLocaleString() : ''}
                  </span>
                </div>
              )}

              {entry.response_message && !entry.buyer_reply && (
                <div className="table-actions" style={{ marginTop: '1rem' }}>
                  {respondingInquiry === entry.inquiry_id ? (
                    <div style={{ width: '100%', textAlign: 'left' }}>
                      <textarea
                        autoFocus
                        placeholder="Type your follow-up reply..."
                        rows={3}
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                      />
                      <div className="flex-row" style={{ gap: '1rem' }}>
                        <button 
                          className="primary-button" 
                          disabled={responseBusy || !responseMessage.trim()}
                          onClick={() => handleBuyerInquiryReply(entry.inquiry_id)}
                        >
                          {responseBusy ? 'Sending...' : 'Send Reply'}
                        </button>
                        <button className="ghost-button" onClick={() => {
                          setRespondingInquiry(null);
                          setResponseMessage('');
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="ghost-button" onClick={() => {
                      setRespondingInquiry(entry.inquiry_id);
                      setResponseMessage('');
                    }}>Reply to Agent</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section-panel animate-enter animate-delay-4">
        <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><CalendarDays size={14} aria-hidden="true" /> Appointments</p>
        <h2>Booked Viewings</h2>
        <div className="list-stack">
          {(dashboard.recent_bookings || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>No viewings are booked yet.</p>}
          {(dashboard.recent_bookings || []).map((entry) => (
            <div className="list-card" key={entry.booking_id}>
              <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong>{entry.property?.title}</strong>
                <span className={`property-status status-${entry.status.toLowerCase()}`}>{entry.status}</span>
              </div>
              <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--brand-base)', fontWeight: 500 }}>
                  {new Date(entry.scheduled_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.property?.city}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                Notes: {entry.notes || 'None provided.'}
              </p>

              {entry.agent_response && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-base)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-base)' }}>Message from Agent:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{entry.agent_response}</p>
                  <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {entry.agent_responded_at ? new Date(entry.agent_responded_at).toLocaleString() : ''}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
