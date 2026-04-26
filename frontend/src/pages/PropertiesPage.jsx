import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { Search, Map, Filter, MessageSquare, ChevronLeft, ChevronRight, X, CalendarDays, Star } from 'lucide-react';

const baseFilters = {
  search: '',
  property_type: '',
  city: '',
  min_price: '',
  max_price: '',
  amenity_id: '',
};

export default function PropertiesPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const [filters, setFilters] = useState(baseFilters);
  const [amenities, setAmenities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [bookingSlots, setBookingSlots] = useState([]);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const deferredSearch = useDeferredValue(filters.search);

  useEffect(() => {
    if (location.state?.selectedProperty) {
      setSelected(location.state.selectedProperty);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    setBookingDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setBookingNotes('');
    setSelectedSlot('');
  }, [selected?.property_id]);

  useEffect(() => {
    apiRequest('/amenities')
      .then((data) => setAmenities(data.data || []))
      .catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    if (!token || user?.role !== 'user') {
      setSavedIds([]);
      return;
    }

    apiRequest('/saved-properties', { token })
      .then((data) => setSavedIds((data.data || []).map((entry) => entry.property_id)))
      .catch(() => setSavedIds([]));
  }, [token, user]);

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('per_page', '6');
    searchParams.set('page', String(page));

    Object.entries({ ...filters, search: deferredSearch }).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });

    setBusy(true);
    apiRequest(`/properties?${searchParams.toString()}`)
      .then((data) => {
        setProperties(data.data || []);
        setMeta(data.meta || { current_page: 1, last_page: 1 });
      })
      .catch(() => {
        setProperties([]);
        setMeta({ current_page: 1, last_page: 1 });
      })
      .finally(() => setBusy(false));
  }, [deferredSearch, filters.amenity_id, filters.city, filters.max_price, filters.min_price, filters.property_type, page]);

  // Handle Escape key to close the drawer
  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected]);

  useEffect(() => {
    if (!selected || selected.status.toLowerCase() !== 'available') {
      setBookingSlots([]);
      setSelectedSlot('');
      return;
    }

    setSlotsBusy(true);
    apiRequest(`/properties/${selected.property_id}/viewing-slots?date=${bookingDate}`)
      .then((data) => {
        setBookingSlots(data.data || []);
        setSelectedSlot((current) => {
          const next = (data.data || []).some((slot) => slot.start_at === current) ? current : '';
          return next;
        });
      })
      .catch((error) => {
        setBookingSlots([]);
        setSelectedSlot('');
        setMessage(error.message);
      })
      .finally(() => setSlotsBusy(false));
  }, [bookingDate, selected]);

  const canBook = useMemo(() => user?.role === 'user', [user]);

  const updateFilter = (name, value) => {
    startTransition(() => {
      setPage(1);
      setFilters((current) => ({ ...current, [name]: value }));
    });
  };

  const toggleSave = async (property) => {
    if (!token || user?.role !== 'user') {
      setMessage('Log in as a user account to save properties.');
      return;
    }

    const isSaved = savedIds.includes(property.property_id);

    if (isSaved) {
      // Show confirmation before unsaving
      setConfirmState({
        title: 'Remove Saved Property',
        message: `Are you sure you want to remove "${property.title}" from your saved collection?`,
        tone: 'warning',
        onConfirm: async () => {
          await apiRequest(`/saved-properties/${property.property_id}`, { method: 'DELETE', token });
          setSavedIds((current) => current.filter((entry) => entry !== property.property_id));
          setMessage('Property removed from saved list.');
          setConfirmState(null);
        },
      });
      return;
    }

    await apiRequest(`/saved-properties/${property.property_id}`, { method: 'POST', token });
    setSavedIds((current) => [...current, property.property_id]);
    setMessage('Property saved successfully.');
  };

  const bookViewing = async (property) => {
    if (!token || user?.role !== 'user') {
      setMessage('Create or log in to a buyer account to book a viewing.');
      return;
    }

    if (!selectedSlot) {
      setMessage('Choose a viewing slot first.');
      return;
    }

    setBookingBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/viewings`, {
        method: 'POST',
        token,
        body: { scheduled_start: selectedSlot, notes: bookingNotes },
      });
      setBookingNotes('');
      setSelectedSlot('');
      const refreshed = await apiRequest(`/properties/${property.property_id}/viewing-slots?date=${bookingDate}`);
      setBookingSlots(refreshed.data || []);
      setMessage('Viewing booked with the assigned agent.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="page-grid property-browser-grid animate-enter">
      <aside className="filter-panel section-panel">
        <div className="flex-row" style={{ marginBottom: '2rem', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem' }}>
          <Filter size={20} className="notification-popup-icon" />
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 400 }}>Refine Search</h2>
        </div>
        
        <label>
          <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Search size={14} /> Keywords
          </span>
          <input 
            value={filters.search} 
            onChange={(event) => updateFilter('search', event.target.value)} 
            placeholder="e.g. Skyline view..."
          />
        </label>

        <label>
          <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>Property Type</span>
          <select value={filters.property_type} onChange={(event) => updateFilter('property_type', event.target.value)}>
            <option value="">All Collections</option>
            {['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Map size={14} /> Location
          </span>
          <input 
            value={filters.city} 
            onChange={(event) => updateFilter('city', event.target.value)} 
            placeholder="Enter city or district..."
          />
        </label>

        <div className="field-grid two-up">
          <label>
            Min Price
            <input 
              value={filters.min_price} 
              onChange={(event) => updateFilter('min_price', event.target.value)} 
              placeholder="e.g. 5M"
            />
          </label>
          <label>
            Max Price
            <input 
              value={filters.max_price} 
              onChange={(event) => updateFilter('max_price', event.target.value)} 
              placeholder="e.g. 20M"
            />
          </label>
        </div>

        <label>
          Premium Amenities
          <select value={filters.amenity_id} onChange={(event) => updateFilter('amenity_id', event.target.value)}>
            <option value="">Any amenities</option>
            {amenities.map((amenity) => (
              <option key={amenity.amenity_id} value={amenity.amenity_id}>{amenity.amenity_name}</option>
            ))}
          </select>
        </label>
      </aside>

      <section className="browser-results" style={{ position: 'relative' }}>
        <div className="section-header-row" style={{ marginBottom: '2.5rem' }}>
          <div>
            <p className="eyebrow">Exclusive Listings</p>
            <h2 style={{ margin: '0.5rem 0 0', fontSize: '2.5rem', fontWeight: 300 }}>Estate Collection</h2>
          </div>
          <span className="result-count">{meta.total || properties.length} properties matched</span>
        </div>
        
        {message ? <p className="inline-message animate-enter"><MessageSquare size={18} /> {message}</p> : null}
        
        {busy ? (
          <div className="card-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ height: '540px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }} className="animate-enter" />
            ))}
          </div>
        ) : (
          <div className="card-grid">
            {properties.length > 0 ? properties.map((property, idx) => (
              <div key={property.property_id} className={`animate-enter animate-delay-${(idx % 3) + 1}`}>
                <PropertyCard
                  onInquire={canBook ? bookViewing : null}
                  onSave={user?.role === 'user' ? toggleSave : null}
                  onView={setSelected}
                  property={property}
                  saved={savedIds.includes(property.property_id)}
                />
              </div>
            )) : (
              <p className="empty-copy">No properties available in this collection that match your criteria. Please adjust your filters.</p>
            )}
          </div>
        )}
        
        {properties.length > 0 && !busy && (
          <div className="pager-row" style={{ marginTop: '4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem', justifyContent: 'center' }}>
            <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous Page">
              <ChevronLeft size={16} aria-hidden="true" /> Previous
            </button>
            <span style={{ fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 1rem' }}>
              Page {meta.current_page || 1} of {meta.last_page || 1}
            </span>
            <button className="ghost-button" disabled={page >= (meta.last_page || 1)} onClick={() => setPage((current) => current + 1)} aria-label="Next Page">
              Next <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* Off-Canvas Property Details Drawer */}
      {selected && (
        <div 
          className="drawer-overlay" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="drawer-title"
          onClick={() => setSelected(null)}
        >
          <aside className="drawer-panel property-folio-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <p className="eyebrow" style={{ margin: 0 }}>Property Folio</p>
              <button 
                className="text-button" 
                onClick={() => setSelected(null)}
                aria-label="Close details drawer"
                style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            
            <div className="drawer-content">
              <img 
                 src={selected.featured_image} 
                 alt={`Exterior view of ${selected.title}`}
                 style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: 'var(--radius-xl)', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }} 
                 onError={(e) => { e.target.style.display = 'none'; }}
              />

              <h2 id="drawer-title" style={{ fontSize: '2.2rem', fontWeight: 300, marginBottom: '0.5rem', lineHeight: 1.2 }}>{selected.title}</h2>
              <p className="detail-price">PHP {selected.price.toLocaleString()}</p>
              
              <div className="chip-row detail-chip-row">
                {selected.amenities.map((amenity) => (
                  <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
                ))}
              </div>

              <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontWeight: 300, fontSize: '1.05rem', margin: '2rem 0' }}>{selected.description}</p>
              
              <dl className="detail-grid">
                <div><dt>Address</dt><dd>{selected.address_line || 'Provided upon booking confirmation'}</dd></div>
                <div><dt>Location</dt><dd>{selected.city}, {selected.province}</dd></div>
                <div><dt>Bedrooms</dt><dd>{selected.bedrooms}</dd></div>
                <div><dt>Bathrooms</dt><dd>{selected.bathrooms}</dd></div>
                <div>
                  <dt>Represented By</dt>
                  <dd>
                    <Link className="text-link" to="/agents">{selected.agent?.full_name}</Link>
                  </dd>
                </div>
                <div><dt>Status</dt><dd style={{ color: selected.status === 'Available' ? 'var(--status-success)' : 'var(--text-main)' }}>{selected.status}</dd></div>
              </dl>
               
              {canBook && selected.status.toLowerCase() === 'available' ? (
                <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="booking-panel-header">
                    <div>
                      <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reserve A 30-Minute Viewing</span>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 300 }}>
                        Choose an open slot from the agent schedule and attach any access notes ahead of the visit.
                      </p>
                    </div>
                    <div className="agent-rating-row" style={{ margin: 0 }}>
                      <span className="agent-rating-pill"><Star size={14} fill="currentColor" /> {selected.agent?.agency_name || 'Independent'}</span>
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

                  <button className="primary-button detail-submit" disabled={bookingBusy || !selectedSlot} onClick={() => bookViewing(selected)}>
                    {bookingBusy ? 'Booking Viewing...' : 'Book Viewing Slot'}
                  </button>
                </div>
              ) : !canBook ? (
                <p className="empty-copy">Sign in as a client to reserve a viewing slot with this agent.</p>
              ) : (
                <p className="empty-copy">This property is currently not available for scheduling.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        tone={confirmState?.tone}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
