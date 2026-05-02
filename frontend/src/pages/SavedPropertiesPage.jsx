import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailsDrawer from '../components/PropertyDetailsDrawer';
import { useAuth } from '../context/AuthContext';
import { Heart, Search } from 'lucide-react';

export default function SavedPropertiesPage() {
  const { authFetch, user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    authFetch('/saved-properties')
      .then((data) => {
        if (!ignore) {
          setProperties(data.data || []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setMessage(error.message);
          setProperties([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authFetch]);

  const confirmRemove = (property) => {
    setConfirmState({
      title: 'Remove Saved Property',
      message: `Remove "${property.title}" from your saved properties?`,
      tone: 'warning',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await authFetch(`/saved-properties/${property.property_id}`, { method: 'DELETE' });
          setProperties((current) => current.filter((entry) => entry.property_id !== property.property_id));
          setMessage('Property removed from saved list.');
        } catch (error) {
          setMessage(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  return (
    <div className="page-shell listing-page animate-enter">
      <section className="section-panel saved-properties-hero">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <Heart size={14} aria-hidden="true" />
            Saved Properties
          </p>
          <h2>{user?.full_name ? `${user.full_name}'s Saved Listings` : 'Saved Listings'}</h2>
        </div>
        <span className="result-count">{properties.length} saved</span>
      </section>

      {message ? <p className="inline-message animate-enter">{message}</p> : null}

      {loading ? (
        <div className="card-grid">
          {[1, 2, 3].map((entry) => (
            <div className="listing-card-skeleton animate-enter" key={entry} />
          ))}
        </div>
      ) : properties.length > 0 ? (
        <div className="card-grid">
          {properties.map((property, index) => (
            <div className={`animate-enter animate-delay-${(index % 3) + 1}`} key={property.property_id}>
              <PropertyCard
                property={property}
                saved
                onSave={confirmRemove}
                onView={setSelected}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-copy saved-properties-empty">
          <Search size={24} aria-hidden="true" />
          <span>No saved properties yet.</span>
          <div className="flex-row saved-properties-empty-actions">
            <Link className="primary-button" to="/buy">Browse For Sale</Link>
            <Link className="ghost-button" to="/rent">Browse Rentals</Link>
          </div>
        </div>
      )}

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
        confirmText={confirmState?.confirmText}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
