import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { Bell, BellOff, Bookmark, Search, Trash2, ArrowRight } from 'lucide-react';

function formatFilterValue(key, value, amenities) {
  if (!value) return null;

  switch (key) {
    case 'property_type':
      return value;
    case 'city':
      return `in ${value}`;
    case 'min_price':
      return `from ₱${Number(value).toLocaleString()}`;
    case 'max_price':
      return `up to ₱${Number(value).toLocaleString()}`;
    case 'bedrooms':
      return `${value}+ Beds`;
    case 'bathrooms':
      return `${value}+ Baths`;
    case 'parking_spaces':
      return `${value}+ Parking`;
    case 'amenity_id':
    case 'amenity_ids': {
      const ids = Array.isArray(value) ? value : String(value).split(',');
      const names = ids
        .map((id) => amenities.find((a) => String(a.amenity_id) === String(id))?.amenity_name)
        .filter(Boolean);

      if (names.length === 0) return null;
      if (names.length === 1) return `with ${names[0]}`;
      return `with ${names.length} amenities`;
    }
    case 'search':
      return `"${value}"`;
    default:
      return null;
  }
}

export default function SavedSearchesPage() {
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [searchesData, amenitiesData] = await Promise.all([
          authFetch('/saved-searches'),
          authFetch('/amenities'),
        ]);

        if (!ignore) {
          setSearches(searchesData.data || []);
          setAmenities(amenitiesData.data || []);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [authFetch]);

  const toggleAlert = async (search) => {
    try {
      const response = await authFetch(`/saved-searches/${search.id}/toggle-alert`, {
        method: 'PUT',
      });
      setSearches((current) =>
        current.map((s) => (s.id === search.id ? { ...s, notify_email: response.notify_email } : s))
      );
      setMessage(`Alerts ${response.notify_email ? 'enabled' : 'disabled'} for "${search.name}".`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const confirmDelete = (search) => {
    setConfirmState({
      title: 'Delete Saved Search',
      message: `Are you sure you want to delete "${search.name}"? You will no longer receive email alerts for this search.`,
      tone: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await authFetch(`/saved-searches/${search.id}`, { method: 'DELETE' });
          setSearches((current) => current.filter((s) => s.id !== search.id));
          setMessage('Search deleted successfully.');
        } catch (error) {
          setMessage(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const runSearch = (search) => {
    const params = new URLSearchParams();
    Object.entries(search.filters || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.join(','));
      } else if (value) {
        params.set(key, value);
      }
    });
    const path = search.listing_purpose === 'rent' ? '/rent' : '/buy';
    navigate(`${path}?${params.toString()}`);
  };

  return (
    <div className="page-shell animate-enter">
      <section className="section-panel saved-properties-hero">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <Bookmark size={14} aria-hidden="true" />
            Saved Searches
          </p>
          <h2>{user?.full_name ? `${user.full_name}'s Search Alerts` : 'Search Alerts'}</h2>
          <p className="intro-text">
            Manage your saved filters and automated email notifications for new matching properties.
          </p>
        </div>
        <span className="result-count">{searches.length} saved</span>
      </section>

      {message ? <p className="inline-message animate-enter">{message}</p> : null}

      {loading ? (
        <div className="saved-searches-list">
          {[1, 2, 3].map((n) => (
            <div key={n} className="saved-search-row skeleton animate-pulse" style={{ height: '100px', marginBottom: '1rem' }} />
          ))}
        </div>
      ) : searches.length > 0 ? (
        <div className="saved-searches-list">
          {searches.map((search, index) => {
            const filterLabels = Object.entries(search.filters || {})
              .map(([key, value]) => formatFilterValue(key, value, amenities))
              .filter(Boolean);

            return (
              <div key={search.id} className={`saved-search-row animate-enter animate-delay-${(index % 5) + 1}`}>
                <div className="saved-search-info">
                  <div className="flex-row" style={{ gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 style={{ margin: 0 }}>{search.name}</h3>
                    <span className="badge" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                      {search.listing_purpose}
                    </span>
                  </div>
                  <p className="search-criteria">
                    {filterLabels.length > 0 ? filterLabels.join(' • ') : 'No specific filters'}
                  </p>
                  <small className="text-muted">Saved on {new Date(search.created_at).toLocaleDateString()}</small>
                </div>

                <div className="saved-search-actions">
                  <div className="alert-toggle">
                    <button
                      className={`icon-button ${search.notify_email ? 'active' : ''}`}
                      onClick={() => toggleAlert(search)}
                      title={search.notify_email ? 'Disable Email Alerts' : 'Enable Email Alerts'}
                      aria-label="Toggle email notifications"
                    >
                      {search.notify_email ? <Bell size={18} className="text-primary" /> : <BellOff size={18} />}
                    </button>
                    <span className="toggle-label">{search.notify_email ? 'Alerts On' : 'Alerts Off'}</span>
                  </div>

                  <button className="ghost-button" onClick={() => runSearch(search)}>
                    View Results <ArrowRight size={14} />
                  </button>

                  <button className="icon-button btn-danger" onClick={() => confirmDelete(search)} title="Delete Search">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-copy">
          <Search size={24} aria-hidden="true" />
          <span>You haven't saved any searches yet.</span>
          <p>Save your search on the browse page to get notified when new properties match your criteria.</p>
          <div className="flex-row" style={{ gap: '1rem', marginTop: '1.5rem' }}>
            <Link className="primary-button" to="/buy">Browse Buy</Link>
            <Link className="ghost-button" to="/rent">Browse Rent</Link>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        tone={confirmState?.tone}
        confirmText={confirmState?.confirmText}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
