import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import AgentInquiryModal from '../components/AgentInquiryModal';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailsDrawer from '../components/PropertyDetailsDrawer';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { Search, Map, Filter, MessageSquare, ChevronLeft, ChevronRight, BedDouble, Bath, Car, SlidersHorizontal } from 'lucide-react';

const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];

const MODE_CONFIG = {
  buy: {
    listingPurpose: 'sale',
    eyebrow: 'For Sale',
    title: 'for Sale',
    intro: 'Compare available homes, lots, and investment properties listed by verified agents.',
    empty: 'No homes for sale match your current filters. Widen the location, price, or property type to see more options.',
    cta: 'Browse rentals instead',
    ctaPath: '/rent',
    priceMinLabel: 'Min Price',
    priceMaxLabel: 'Max Price',
    priceHint: 'For-sale prices are shown as total property prices.',
  },
  rent: {
    listingPurpose: 'rent',
    eyebrow: 'For Rent',
    title: 'for Rent',
    intro: 'Find rental-ready homes and condos with monthly pricing and location details up front.',
    empty: 'No rentals match your current filters. Try a broader city, lower monthly range, or fewer required specs.',
    cta: 'Browse homes for sale',
    ctaPath: '/buy',
    priceMinLabel: 'Min Monthly Rent',
    priceMaxLabel: 'Max Monthly Rent',
    priceHint: 'Rental prices are shown per month.',
  },
};

const baseFilters = {
  search: '',
  property_type: '',
  city: '',
  min_price: '',
  max_price: '',
  bedrooms: '',
  bathrooms: '',
  parking_spaces: '',
  amenity_id: '',
};

function readFiltersFromSearch(searchParams) {
  return Object.fromEntries(
    Object.keys(baseFilters).map((key) => [key, searchParams.get(key) || '']),
  );
}

export default function PropertiesPage({ mode = 'buy' }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.buy;
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => readFiltersFromSearch(searchParams));
  const [draftFilters, setDraftFilters] = useState(() => readFiltersFromSearch(searchParams));
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [amenities, setAmenities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => location.state?.selectedProperty || null);
  const [contactProperty, setContactProperty] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    const nextFilters = readFiltersFromSearch(new URLSearchParams(location.search));
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setPage(1);
  }, [mode, location.search]);

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
      return undefined;
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
    let ignore = false;

    const fetchProperties = async () => {
      const params = new URLSearchParams();
      params.set('per_page', '6');
      params.set('page', String(page));
      params.set('listing_purpose', config.listingPurpose);

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      setBusy(true);
      try {
        const data = await apiRequest(`/properties?${params.toString()}`);
        if (!ignore) {
          setProperties(data.data || []);
          setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        }
      } catch {
        if (!ignore) {
          setProperties([]);
          setMeta({ current_page: 1, last_page: 1, total: 0 });
        }
      } finally {
        if (!ignore) {
          setBusy(false);
        }
      }
    };

    fetchProperties();

    return () => { ignore = true; };
  }, [config.listingPurpose, filters, page]);

  const canUseBuyerActions = useMemo(() => user?.role === 'user' && Boolean(user?.email_verified_at), [user]);
  const appliedFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  const updateDraftFilter = (name, value) => {
    setDraftFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    startTransition(() => {
      const nextParams = new URLSearchParams();
      Object.entries(draftFilters).forEach(([key, value]) => {
        if (value) nextParams.set(key, value);
      });
      setPage(1);
      setSearchParams(nextParams, { replace: true });
      setFilters(draftFilters);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setPage(1);
      setDraftFilters(baseFilters);
      setFilters(baseFilters);
      setSearchParams({}, { replace: true });
    });
  };

  const toggleSave = async (property) => {
    if (!canUseBuyerActions) {
      setMessage('Verify your email and log in as a buyer to save properties.');
      return;
    }

    const isSaved = savedIds.includes(property.property_id);

    if (isSaved) {
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

  const openAgentInquiry = (property) => {
    if (!canUseBuyerActions) {
      setMessage('Verify your email and log in as a buyer to email an agent.');
      return;
    }

    setContactProperty(property);
  };

  return (
    <div className="page-shell listing-page animate-enter">

      <button
        className="ghost-button mobile-filter-toggle"
        type="button"
        onClick={() => setFiltersOpen((current) => !current)}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        {filtersOpen ? 'Hide Filters' : 'Show Filters'}
      </button>

      <div className="property-browser-grid">
        <aside className={`filter-panel section-panel ${filtersOpen ? 'filter-panel-open' : ''}`}>
          <form onSubmit={applyFilters}>
            <div className="flex-row filter-heading">
              <Filter size={20} className="notification-popup-icon" />
              <h2>Refine Search</h2>
            </div>

            <label>
              <span className="flex-row filter-label">
                <Search size={14} /> Keywords
              </span>
              <input
                value={draftFilters.search}
                onChange={(event) => updateDraftFilter('search', event.target.value)}
                placeholder={mode === 'rent' ? 'e.g. furnished, BGC...' : 'e.g. Skyline view...'}
              />
            </label>

            <label>
              Property Type
              <select value={draftFilters.property_type} onChange={(event) => updateDraftFilter('property_type', event.target.value)}>
                <option value="">All property types</option>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="flex-row filter-label">
                <Map size={14} /> Location
              </span>
              <input
                value={draftFilters.city}
                onChange={(event) => updateDraftFilter('city', event.target.value)}
                placeholder="Enter city or district..."
              />
            </label>

            <div className="field-grid two-up">
              <label>
                {config.priceMinLabel}
                <input
                  inputMode="numeric"
                  value={draftFilters.min_price}
                  onChange={(event) => updateDraftFilter('min_price', event.target.value)}
                  placeholder={mode === 'rent' ? 'e.g. 30000' : 'e.g. 5000000'}
                />
              </label>
              <label>
                {config.priceMaxLabel}
                <input
                  inputMode="numeric"
                  value={draftFilters.max_price}
                  onChange={(event) => updateDraftFilter('max_price', event.target.value)}
                  placeholder={mode === 'rent' ? 'e.g. 90000' : 'e.g. 20000000'}
                />
              </label>
            </div>

            <div className="field-grid three-up compact-filter-grid">
              <label>
                <span className="flex-row filter-label"><BedDouble size={14} /> Beds</span>
                <select value={draftFilters.bedrooms} onChange={(event) => updateDraftFilter('bedrooms', event.target.value)}>
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}+</option>)}
                </select>
              </label>
              <label>
                <span className="flex-row filter-label"><Bath size={14} /> Baths</span>
                <select value={draftFilters.bathrooms} onChange={(event) => updateDraftFilter('bathrooms', event.target.value)}>
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}+</option>)}
                </select>
              </label>
              <label>
                <span className="flex-row filter-label"><Car size={14} /> Parking</span>
                <select value={draftFilters.parking_spaces} onChange={(event) => updateDraftFilter('parking_spaces', event.target.value)}>
                  <option value="">Any</option>
                  {[1, 2, 3].map((value) => <option key={value} value={value}>{value}+</option>)}
                </select>
              </label>
            </div>

            <label>
              Amenities
              <select value={draftFilters.amenity_id} onChange={(event) => updateDraftFilter('amenity_id', event.target.value)}>
                <option value="">Any amenities</option>
                {amenities.map((amenity) => (
                  <option key={amenity.amenity_id} value={amenity.amenity_id}>{amenity.amenity_name}</option>
                ))}
              </select>
            </label>

            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply Filters
              </button>
              <button className="ghost-button" onClick={clearFilters} type="button">
                Reset
              </button>
            </div>
          </form>
        </aside>

        <section className="browser-results">
          <div className="section-header-row listing-results-header">
            <div>
              <p className="eyebrow">Available Inventory</p>
              <h2>{config.title}</h2>
            </div>
            <span className="result-count">{meta.total || 0} matched{appliedFilterCount ? ` - ${appliedFilterCount} filters` : ''}</span>
          </div>

          {message ? <p className="inline-message animate-enter"><MessageSquare size={18} /> {message}</p> : null}

          {busy ? (
            <div className="card-grid">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="listing-card-skeleton animate-enter" />
              ))}
            </div>
          ) : (
            <div className="card-grid">
              {properties.length > 0 ? properties.map((property, idx) => (
                <div key={property.property_id} className={`animate-enter animate-delay-${(idx % 3) + 1}`}>
                  <PropertyCard
                    onInquire={openAgentInquiry}
                    onSave={user?.role === 'user' ? toggleSave : null}
                    onView={setSelected}
                    property={property}
                    saved={savedIds.includes(property.property_id)}
                  />
                </div>
              )) : (
                <div className="empty-copy">
                  <span>{config.empty}</span>
                  <Link className="primary-button" to={config.ctaPath}>{config.cta}</Link>
                </div>
              )}
            </div>
          )}

          {properties.length > 0 && !busy && (
            <div className="pager-row listing-pager">
              <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous Page">
                <ChevronLeft size={16} aria-hidden="true" /> Previous
              </button>
              <span>
                Page {meta.current_page || 1} of {meta.last_page || 1}
              </span>
              <button className="ghost-button" disabled={page >= (meta.last_page || 1)} onClick={() => setPage((current) => current + 1)} aria-label="Next Page">
                Next <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      </div>

      <PropertyDetailsDrawer
        property={selected}
        onClose={() => setSelected(null)}
        onInquire={openAgentInquiry}
      />

      <AgentInquiryModal
        property={contactProperty}
        onClose={() => setContactProperty(null)}
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
