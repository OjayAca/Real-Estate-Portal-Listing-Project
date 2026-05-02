import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Star, X, ImageIcon } from 'lucide-react';

export default function PropertyDetailsDrawer({ property, onClose, onMessage }) {
  const { user } = useAuth();
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);

  useEffect(() => {
    if (!property) {
      return;
    }

    setInquiryMessage('');
  }, [property]);

  // Handle Escape key to close the drawer
  useEffect(() => {
    if (!property) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [property, onClose]);

  const canUseBuyerActions = useMemo(() => user?.role === 'user' && Boolean(user?.email_verified_at), [user]);

  const sendInquiry = async () => {
    if (!canUseBuyerActions) {
      if (onMessage) onMessage('Verify your email and log in as a buyer to send an inquiry.');
      return;
    }

    if (!inquiryMessage.trim() || inquiryMessage.length < 10) {
      if (onMessage) onMessage('Inquiry message must be at least 10 characters.');
      return;
    }

    setInquiryBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/inquiries`, {
        method: 'POST',
        body: { message: inquiryMessage },
      });
      setInquiryMessage('');
      if (onMessage) onMessage('Your inquiry has been sent to the agent.');
    } catch (error) {
      if (onMessage) onMessage(error.message);
    } finally {
      setInquiryBusy(false);
    }
  };

  if (!property) return null;

  return (
    <div 
      className="drawer-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="drawer-title"
      onClick={onClose}
    >
      <aside className="drawer-panel property-folio-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <p className="eyebrow" style={{ margin: 0 }}>Property Folio</p>
          <button 
            className="icon-button" 
            onClick={onClose}
            aria-label="Close details drawer"
            style={{ width: '36px', height: '36px' }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        <div className="drawer-content">
          {property.featured_image ? (
            <img 
               src={property.featured_image} 
               alt={`Exterior view of ${property.title}`}
               style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: 'var(--radius-xl)', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }} 
               onError={(e) => { 
                 e.target.style.display = 'none';
                 e.target.nextSibling.style.display = 'flex';
               }}
            />
          ) : null}
          <div className="empty-copy" style={{ display: property.featured_image ? 'none' : 'flex', height: '320px', marginBottom: '2.5rem', padding: 0 }}>
             <ImageIcon size={48} aria-hidden="true" />
             <span>Image not available</span>
          </div>

          <h2 id="drawer-title" style={{ fontSize: '2.2rem', fontWeight: 300, marginBottom: '0.5rem', lineHeight: 1.2 }}>{property.title}</h2>
          <p className="detail-price">PHP {property.price.toLocaleString()}</p>
          
          <div className="chip-row detail-chip-row">
            {(property.amenities || []).map((amenity) => (
              <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
            ))}
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontWeight: 300, fontSize: '1.05rem', margin: '2rem 0' }}>{property.description}</p>
          
          <dl className="detail-grid">
            <div><dt>Address</dt><dd>{property.address_line || 'Provided upon booking confirmation'}</dd></div>
            <div><dt>Location</dt><dd>{property.city}, {property.province}</dd></div>
            <div><dt>Bedrooms</dt><dd>{property.bedrooms}</dd></div>
            <div><dt>Bathrooms</dt><dd>{property.bathrooms}</dd></div>
            <div>
              <dt>Represented By</dt>
              <dd>
                <Link className="text-link" to="/agents">{property.agent?.full_name}</Link>
              </dd>
            </div>
            <div><dt>Status</dt><dd style={{ color: property.status === 'Available' ? 'var(--status-success)' : 'var(--text-main)' }}>{property.status}</dd></div>
          </dl>
           
          {canUseBuyerActions && property.status.toLowerCase() === 'available' ? (
            <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="booking-panel-header">
                <div>
                  <span style={{ display: 'block', marginBottom: '1rem', fontWeight: 500, fontSize: '1.2rem' }}>Contact Representing Agent</span>
                  <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontWeight: 300 }}>
                    Have questions about this listing? Send a direct message to the representing agent for more details or to express interest.
                  </p>
                </div>
                <div className="agent-rating-row" style={{ margin: 0 }}>
                  <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {property.agent?.agency_name || 'Independent'}</span>
                </div>
              </div>

              <label>
                <span style={{ display: 'block', marginBottom: '1rem', fontWeight: 500 }}>Your Message</span>
                <textarea
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  placeholder="Ask about documentation, pricing flexibility, or site conditions."
                  rows="6"
                  value={inquiryMessage}
                  aria-label="Inquiry message"
                />
              </label>
              
              <button
                className="primary-button detail-submit"
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
                disabled={inquiryBusy || !inquiryMessage.trim()}
                onClick={sendInquiry}
              >
                {inquiryBusy ? 'Sending Message...' : 'Send Message to Agent'}
              </button>
            </div>
          ) : !canUseBuyerActions ? (
            <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <p className="empty-copy">Sign in as a client to contact the representing agent for this property.</p>
            </div>
          ) : (
            <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <p className="empty-copy">This property is currently not accepting new inquiries.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
