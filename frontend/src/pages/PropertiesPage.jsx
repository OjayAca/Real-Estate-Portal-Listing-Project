import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { useAuth } from '../context/AuthContext';
import { Search, Map, Filter, MessageSquare, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
  const [filters, setFilters] = useState(baseFilters);
  const [amenities, setAmenities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const deferredSearch = useDeferredValue(filters.search);

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

  const canInquire = useMemo(() => user?.role === 'user', [user]);

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

    const saved = savedIds.includes(property.property_id);
    const nextMethod = saved ? 'DELETE' : 'POST';
    await apiRequest(`/saved-properties/${property.property_id}`, { method: nextMethod, token });
    setSavedIds((current) =>
      saved ? current.filter((entry) => entry !== property.property_id) : [...current, property.property_id],
    );
    setMessage(saved ? 'Property removed from saved list.' : 'Property saved successfully.');
  };

  const sendInquiry = async (property) => {
    if (!token || user?.role !== 'user') {
      setMessage('Create or log in to a buyer account to send an inquiry.');
      return;
    }

    if (!inquiryMessage.trim()) {
      setMessage('Write a short inquiry message first.');
      return;
    }

    setInquiryBusy(true);
    try {
      await apiRequest(`/properties/${property.property_id}/inquiries`, {
        method: 'POST',
        token,
        body: { message: inquiryMessage },
      });
      setInquiryMessage('');
      setMessage('Inquiry sent to the assigned agent.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setInquiryBusy(false);
    }
  };

  return (
    <div className="page-grid property-browser-grid">
      <aside className="filter-panel section-panel">
        <div className="flex-row" style={{ marginBottom: '1.5rem', gap: '0.5rem' }}>
          <Filter size={20} className="notification-popup-icon" />
          <h2 style={{ margin: 0 }}>Filters</h2>
        </div>
        
        <label>
          <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Search size={14} /> Search
          </span>
          <input 
            value={filters.search} 
            onChange={(event) => updateFilter('search', event.target.value)} 
            placeholder="Keywords, title..."
          />
        </label>

        <label>
          Property Type
          <select value={filters.property_type} onChange={(event) => updateFilter('property_type', event.target.value)}>
            <option value="">All Collections</option>
            {['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="flex-row" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Map size={14} /> City
          </span>
          <input 
            value={filters.city} 
            onChange={(event) => updateFilter('city', event.target.value)} 
            placeholder="Enter location..."
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
        <div className="section-header-row" style={{ marginBottom: '2rem' }}>
          <div>
            <p className="eyebrow">Exclusive Listings</p>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 300 }}>Estate Collection</h2>
          </div>
          <span className="result-count">{meta.total || properties.length} properties matched</span>
        </div>
        
        {message ? <p className="inline-message"><MessageSquare size={18} /> {message}</p> : null}
        {busy ? <p className="empty-copy">Curating collection...</p> : null}
        
        <div className="card-grid">
          {properties.length > 0 ? properties.map((property) => (
            <PropertyCard
              key={property.property_id}
              onInquire={canInquire ? sendInquiry : null}
              onSave={user?.role === 'user' ? toggleSave : null}
              onView={setSelected}
              property={property}
              saved={savedIds.includes(property.property_id)}
            />
          )) : !busy && (
            <p className="empty-copy">No properties available in this collection that match your criteria.</p>
          )}
        </div>
        
        {properties.length > 0 && (
          <div className="pager-row" style={{ marginTop: '3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {meta.current_page || 1} of {meta.last_page || 1}
            </span>
            <button className="ghost-button" disabled={page >= (meta.last_page || 1)} onClick={() => setPage((current) => current + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {/* Conditional rendering for the Detail Panel */}
      {selected ? (
        <aside className="section-panel detail-panel" style={{ position: 'fixed', right: '1.5rem', top: '7.5rem', width: '420px', bottom: '1.5rem', overflowY: 'auto', zIndex: 60, boxShadow: 'var(--shadow-xl)' }}>
          <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <p className="eyebrow">Property Details</p>
            <button className="text-button" onClick={() => setSelected(null)}>
              <X size={20} />
            </button>
          </div>
          
          <img 
             src={selected.featured_image} 
             alt={selected.title} 
             style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }} 
             onError={(e) => { e.target.style.display = 'none'; }}
          />

          <h2>{selected.title}</h2>
          <p className="detail-price">PHP {selected.price.toLocaleString()}</p>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontWeight: 300 }}>{selected.description}</p>
          
          <div className="chip-row detail-chip-row">
            {selected.amenities.map((amenity) => (
              <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
            ))}
          </div>
          
          <dl className="detail-grid">
            <div><dt>Address</dt><dd>{selected.address_line || 'Provided upon inquiry'}</dd></div>
            <div><dt>Location</dt><dd>{selected.city}, {selected.province}</dd></div>
            <div><dt>Bedrooms</dt><dd>{selected.bedrooms}</dd></div>
            <div><dt>Bathrooms</dt><dd>{selected.bathrooms}</dd></div>
            <div><dt>Represented By</dt><dd>{selected.agent?.full_name}</dd></div>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
          </dl>
          
          {canInquire && selected.status.toLowerCase() === 'available' ? (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
              <label>
                Private Inquiry
                <textarea
                  onChange={(event) => setInquiryMessage(event.target.value)}
                  placeholder="Request a private viewing, financing options, or specific unit details."
                  rows="4"
                  value={inquiryMessage}
                />
              </label>
              <button className="primary-button detail-submit" disabled={inquiryBusy} onClick={() => sendInquiry(selected)}>
                {inquiryBusy ? 'Submitting...' : 'Send Inquiry To Agent'}
              </button>
            </div>
          ) : !canInquire ? (
            <p className="empty-copy">Sign in as a client to arrange a viewing or send inquiries.</p>
          ) : (
            <p className="empty-copy">This property is currently not available for inquiry.</p>
          )}
        </aside>
      ) : (
        <aside className="detail-panel" style={{ display: 'none' }}></aside> /* Hidden naturally when not selected */
      )}
    </div>
  );
}
