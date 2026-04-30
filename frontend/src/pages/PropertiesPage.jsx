import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../api/client';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailsDrawer from '../components/PropertyDetailsDrawer';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { Search, Map, Filter, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

const baseFilters = {
  search: '',
  property_type: '',
  city: '',
  min_price: '',
  max_price: '',
  amenity_id: '',
};

export default function PropertiesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [filters, setFilters] = useState(baseFilters);
  const [amenities, setAmenities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => location.state?.selectedProperty || null);
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    if (location.state?.selectedProperty) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    apiRequest('/amenities')
      .then((data) => setAmenities(data.data || []))
      .catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    let ignore = false;
    if (user?.role !== 'user' || !user?.email_verified_at) {
      setSavedIds((current) => (current.length > 0 ? [] : current));
      return;
    }

    apiRequest('/saved-properties')
      .then((data) => {
        if (!ignore) setSavedIds((data.data || []).map((entry) => entry.property_id));
      })
      .catch(() => {
        if (!ignore) setSavedIds([]);
      });

    return () => { ignore = true; };
  }, [user]);

  useEffect(() => {
    const fetchProperties = async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('per_page', '6');
      searchParams.set('page', String(page));

      Object.entries(deferredFilters).forEach(([key, value]) => {
        if (value) {
          searchParams.set(key, value);
        }
      });

      setBusy(true);
      try {
        const data = await apiRequest(`/properties?${searchParams.toString()}`);
        setProperties(data.data || []);
        setMeta(data.meta || { current_page: 1, last_page: 1 });
      } catch {
        setProperties([]);
        setMeta({ current_page: 1, last_page: 1 });
      } finally {
        setBusy(false);
      }
    };

    fetchProperties();
  }, [deferredFilters, page]);

  const canUseBuyerActions = useMemo(() => user?.role === 'user' && Boolean(user?.email_verified_at), [user]);

  const updateFilter = (name, value) => {
    startTransition(() => {
      setPage(1);
      setFilters((current) => ({ ...current, [name]: value }));
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setPage(1);
      setFilters(baseFilters);
    });
  };

  const toggleSave = async (property) => {
    if (!canUseBuyerActions) {
      setMessage('Verify your email and log in as a buyer to save properties.');
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
          await apiRequest(`/saved-properties/${property.property_id}`, { method: 'DELETE' });
          setSavedIds((current) => current.filter((entry) => entry !== property.property_id));
          setMessage('Property removed from saved list.');
          setConfirmState(null);
        },
      });
      return;
    }

    await apiRequest(`/saved-properties/${property.property_id}`, { method: 'POST' });
    setSavedIds((current) => [...current, property.property_id]);
    setMessage('Property saved successfully.');
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

        <button 
          className="ghost-button" 
          onClick={clearFilters} 
          style={{ width: '100%', marginTop: '1rem', border: '1px solid var(--border-subtle)' }}
          type="button"
        >
          Clear All Filters
        </button>
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
              <div key={n} style={{ height: '540px', background: 'var(--input-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }} className="animate-enter" />
            ))}
          </div>
        ) : (
          <div className="card-grid">
            {properties.length > 0 ? properties.map((property, idx) => (
              <div key={property.property_id} className={`animate-enter animate-delay-${(idx % 3) + 1}`}>
                <PropertyCard
                  onInquire={canUseBuyerActions ? setSelected : null}
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
      <PropertyDetailsDrawer 
        property={selected} 
        onClose={() => setSelected(null)} 
        onMessage={setMessage}
      />

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
