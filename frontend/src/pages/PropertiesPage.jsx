import { startTransition, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import AgentInquiryModal from '../components/AgentInquiryModal';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailsDrawer from '../components/PropertyDetailsDrawer';
import ViewingRequestModal from '../components/ViewingRequestModal';
import ConfirmModal from '../components/ConfirmModal';
import InlineMessage from '../components/InlineMessage';
import { useAuth } from '../context/AuthContext';
import { Search, Map, Filter, MessageSquare, ChevronLeft, ChevronRight, BedDouble, Bath, Car, SlidersHorizontal, Bookmark } from 'lucide-react';

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
  amenity_ids: [],
};

function readFiltersFromSearch(searchParams) {
  const filters = {};
  Object.keys(baseFilters).forEach((key) => {
    if (key === 'amenity_ids') {
      const vals = searchParams.get('amenity_ids');
      const legacyVal = searchParams.get('amenity_id');
      if (vals) {
        filters[key] = vals.split(',').filter(Boolean);
      } else if (legacyVal) {
        filters[key] = [legacyVal];
      } else {
        filters[key] = [];
      }
    } else {
      filters[key] = searchParams.get(key) || '';
    }
  });
  return filters;
}

export default function PropertiesPage({ mode = 'buy' }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.buy;
  const { user, authFetch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [bookingProperty, setBookingProperty] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [busy, setBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchBusy, setSaveSearchBusy] = useState(false);

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
    if (user?.role !== 'user') {
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

  const canUseBuyerActions = useMemo(() => user?.role === 'user', [user]);
  const appliedFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    }).length;
  }, [filters]);

  const updateDraftFilter = (name, value) => {
    setDraftFilters((current) => ({ ...current, [name]: value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    startTransition(() => {
      const nextParams = new URLSearchParams();
      Object.entries(draftFilters).forEach(([key, value]) => {
        if (key === 'amenity_ids') {
          if (value.length > 0) nextParams.set('amenity_ids', value.join(','));
        } else if (value) {
          nextParams.set(key, value);
        }
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

  const toggleAmenity = (id) => {
    setDraftFilters((current) => {
      const ids = current.amenity_ids.includes(String(id))
        ? current.amenity_ids.filter((item) => item !== String(id))
        : [...current.amenity_ids, String(id)];
      return { ...current, amenity_ids: ids };
    });
  };

  const toggleSave = async (property) => {
    if (!canUseBuyerActions) {
      setMessage('Log in as a buyer to save properties.');
      setMessageTone('warning');
      return;
    }

    const isSaved = savedIds.includes(property.property_id);

    if (isSaved) {
      setConfirmState({
        title: 'Remove Saved Property',
        message: `Are you sure you want to remove "${property.title}" from your saved collection?`,
        tone: 'warning',
        onConfirm: async () => {
          try {
            await apiRequest(`/saved-properties/${property.property_id}`, { method: 'DELETE' });
            setSavedIds((current) => current.filter((entry) => entry !== property.property_id));
            setMessage('Property removed from saved list.');
            setMessageTone('success');
          } catch (error) {
            setMessage(error.message);
            setMessageTone('error');
          } finally {
            setConfirmState(null);
          }
        },
      });
      return;
    }

    try {
      await apiRequest(`/saved-properties/${property.property_id}`, { method: 'POST' });
      setSavedIds((current) => [...current, property.property_id]);
      setMessage('Property saved successfully.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
    }
  };

  const openAgentInquiry = (property) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (user.role !== 'user') {
      setMessage('Log in as a buyer to email an agent.');
      setMessageTone('warning');
      return;
    }

    setContactProperty(property);
  };

  const openBookingModal = (property) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    if (user.role !== 'user') {
      setMessage('Log in as a buyer to book a viewing.');
      setMessageTone('warning');
      return;
    }

    setBookingProperty(property);
  };

  const saveCurrentSearch = async () => {
    if (!saveSearchName.trim()) return;

    setSaveSearchBusy(true);
    try {
      const activeFilters = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (value) activeFilters[key] = value;
      });

      await authFetch('/saved-searches', {
        method: 'POST',
        body: {
          name: saveSearchName.trim(),
          filters: activeFilters,
          listing_purpose: config.listingPurpose,
          notify_email: false,
        },
      });

      setMessage('Search saved! Manage alerts from Account Settings.');
      setMessageTone('success');
      setSaveSearchOpen(false);
      setSaveSearchName('');
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
    } finally {
      setSaveSearchBusy(false);
    }
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

            <div className="filter-group">
              <span className="filter-label">Amenities</span>
              <div className="checkbox-grid">
                {amenities
                  .filter((a) => a.amenity_name.toLowerCase() !== 'parking')
                  .map((amenity) => (
                    <label key={amenity.amenity_id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={(draftFilters.amenity_ids || []).includes(String(amenity.amenity_id))}
                        onChange={() => toggleAmenity(amenity.amenity_id)}
                      />
                      <span>{amenity.amenity_name}</span>
                    </label>
                  ))}
              </div>
            </div>

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
            {canUseBuyerActions && appliedFilterCount > 0 && (
              <button className="ghost-button" type="button" onClick={() => setSaveSearchOpen(true)} style={{ marginLeft: '0.25rem' }}>
                <Bookmark size={14} aria-hidden="true" /> Save Search
              </button>
            )}
          </div>

          <InlineMessage
            icon={MessageSquare}
            message={message}
            tone={messageTone}
            onDismiss={() => setMessage('')}
          />

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
        onBookViewing={openBookingModal}
      />

      <ViewingRequestModal
        property={bookingProperty}
        onClose={() => setBookingProperty(null)}
        onSuccess={(msg) => {
          setMessage(msg);
          setMessageTone('success');
        }}
      />

      <AgentInquiryModal
        property={contactProperty}
        onClose={() => setContactProperty(null)}
        onMessage={(nextMessage) => {
          setMessage(nextMessage);
          setMessageTone('success');
        }}
      />

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        tone={confirmState?.tone}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />

      {saveSearchOpen && (
        <div className="modal-backdrop" onClick={() => setSaveSearchOpen(false)}>
          <div className="modal-card modal-card-premium" onClick={(event) => event.stopPropagation()}>
            <div className="flex-row" style={{ gap: '1.25rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <div className="modal-icon-container">
                <Bookmark size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Save This Search</h3>
                <p className="modal-subtext" style={{ margin: '0.25rem 0 0', opacity: 0.8 }}>Get alerts for new properties matching this criteria.</p>
              </div>
            </div>

            <div className="modal-body" style={{ marginTop: '2rem' }}>
              <label className="form-label-premium">
                Search Name
                <input
                  autoFocus
                  className="premium-input"
                  maxLength={100}
                  value={saveSearchName}
                  onChange={(event) => setSaveSearchName(event.target.value)}
                  placeholder="e.g. 3BR condos in Makati"
                  onKeyDown={(event) => { if (event.key === 'Enter') saveCurrentSearch(); }}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setSaveSearchOpen(false)}>Cancel</button>
              <button className="primary-button" type="button" disabled={saveSearchBusy || !saveSearchName.trim()} onClick={saveCurrentSearch}>
                {saveSearchBusy ? 'Saving...' : 'Save Search'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
