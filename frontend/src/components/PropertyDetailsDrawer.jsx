import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Star, X, ImageIcon } from 'lucide-react';

export default function PropertyDetailsDrawer({ property, onClose, onMessage }) {
  const { user } = useAuth();
  const [bookingDate, setBookingDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [bookingSlots, setBookingSlots] = useState([]);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);

  useEffect(() => {
    if (!property) {
      return;
    }

    setBookingDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setBookingNotes('');
    setSelectedSlot('');
    setInquiryMessage('');
  }, [property]);

  useEffect(() => {
    if (!property || property.status.toLowerCase() !== 'available') {
      setBookingSlots([]);
      setSelectedSlot('');
      return;
    }

    let ignore = false;
    setSlotsBusy(true);
    apiRequest(`/properties/${property.property_id}/viewing-slots?date=${bookingDate}`)
      .then((data) => {
        if (ignore) return;
        setBookingSlots(data.data || []);
        setSelectedSlot((current) => {
          const next = (data.data || []).some((slot) => slot.start_at === current) ? current : '';
          return next;
        });
      })
      .catch((error) => {
        if (ignore) return;
        setBookingSlots([]);
        setSelectedSlot('');
        if (onMessage) onMessage(error.message);
      })
      .finally(() => {
        if (ignore) return;
        setSlotsBusy(false);
      });

    return () => {
      ignore = true;
    };
  }, [bookingDate, property, onMessage]);

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

  const bookViewing = async () => {
    if (!canUseBuyerActions) {
      if (onMessage) onMessage('Verify your email and log in as a buyer to book a viewing.');
      return;
    }

    if (!selectedSlot) {
      if (onMessage) onMessage('Choose a viewing slot first.');
      return;
    }

    setBookingBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/viewings`, {
        method: 'POST',
        body: { scheduled_start: selectedSlot, notes: bookingNotes },
      });
      setBookingNotes('');
      setSelectedSlot('');
      const refreshed = await apiRequest(`/properties/${property.property_id}/viewing-slots?date=${bookingDate}`);
      setBookingSlots(refreshed.data || []);
      if (onMessage) onMessage('Viewing booked with the assigned agent.');
    } catch (error) {
      if (onMessage) onMessage(error.message);
    } finally {
      setBookingBusy(false);
    }
  };

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
                  <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reserve A 30-Minute Viewing</span>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 300 }}>
                    Choose an open slot from the agent schedule and attach any access notes ahead of the visit.
                  </p>
                </div>
                <div className="agent-rating-row" style={{ margin: 0 }}>
                  <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {property.agent?.agency_name || 'Independent'}</span>
                </div>
              </div>

              <label>
                <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <CalendarDays size={16} aria-hidden="true" />
                  Viewing Date
                </span>
                <input min={new Date().toISOString().slice(0, 10)} type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
              </label>

              <div className="booking-slot-grid">
                {slotsBusy ? <p className="empty-copy" style={{ padding: '2rem' }}>Loading available slots...</p> : null}
                {!slotsBusy && bookingSlots.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No open slots on this date. Try another day.</p> : null}
                {!slotsBusy && bookingSlots.map((slot) => (
                  <button
                    key={slot.start_at}
                    className={selectedSlot === slot.start_at ? 'primary-button booking-slot-active' : 'ghost-button'}
                    onClick={() => setSelectedSlot(slot.start_at)}
                    type="button"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              <label>
                <span style={{ display: 'block', marginBottom: '1rem', fontWeight: 500 }}>Viewing Notes</span>
                <textarea
                  onChange={(event) => setBookingNotes(event.target.value)}
                  placeholder="Add gate instructions, unit questions, or viewing priorities."
                  rows="4"
                  value={bookingNotes}
                  aria-label="Viewing notes"
                />
              </label>

              <button className="primary-button detail-submit" disabled={bookingBusy || !selectedSlot} onClick={bookViewing}>
                {bookingBusy ? 'Booking Viewing...' : 'Book Viewing Slot'}
              </button>

              <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ display: 'block', marginBottom: '1rem', fontWeight: 500 }}>Direct Inquiry</span>
                <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontWeight: 300 }}>
                  Have questions about this listing? Send a direct message to the representing agent.
                </p>
                <textarea
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  placeholder="Ask about documentation, pricing flexibility, or site conditions."
                  rows="4"
                  value={inquiryMessage}
                  aria-label="Inquiry message"
                />
                <button
                  className="ghost-button"
                  style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                  disabled={inquiryBusy || !inquiryMessage.trim()}
                  onClick={sendInquiry}
                >
                  {inquiryBusy ? 'Sending...' : 'Send Inquiry'}
                </button>
              </div>
            </div>
          ) : !canUseBuyerActions ? (
            <p className="empty-copy">Sign in as a client to reserve a viewing slot with this agent.</p>
          ) : (
            <p className="empty-copy">This property is currently not available for scheduling.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
