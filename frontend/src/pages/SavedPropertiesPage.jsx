import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AgentInquiryModal from '../components/AgentInquiryModal';
import ConfirmModal from '../components/ConfirmModal';
import InlineMessage from '../components/InlineMessage';
import PropertyCard from '../components/PropertyCard';
import PropertyDetailsDrawer from '../components/PropertyDetailsDrawer';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Heart, Search } from 'lucide-react';

export default function SavedPropertiesPage() {
  const { authFetch, user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [selected, setSelected] = useState(null);
  const [contactProperty, setContactProperty] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    authFetch(`/saved-properties?page=${page}&per_page=12`)
      .then((data) => {
        if (!ignore) {
          setProperties(data.data || []);
          setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setMessage(error.message);
          setMessageTone('error');
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
  }, [authFetch, page]);

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
          setMeta((current) => ({ ...current, total: Math.max(0, current.total - 1) }));

          // If the page is now empty and not the first page, go back one page
          if (properties.length <= 1 && page > 1) {
            setPage((current) => current - 1);
          }

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
  };

  return (
    <div className="page-shell listing-page animate-enter">
      <section className="section-panel saved-properties-hero">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <Heart size={14} aria-hidden="true" style={{ color: '#ef4444', fill: '#ef4444' }} />
            Saved Properties
          </p>
          <h2>{user?.full_name ? `${user.full_name}'s Saved Listings` : 'Saved Listings'}</h2>
        </div>
        <span className="result-count">{meta.total} saved</span>
      </section>

      <InlineMessage
        message={message}
        tone={messageTone}
        onDismiss={() => setMessage('')}
      />

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

      {!loading && properties.length > 0 && meta.last_page > 1 && (
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

      <PropertyDetailsDrawer
        property={selected}
        onClose={() => setSelected(null)}
        onInquire={setContactProperty}
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
        confirmText={confirmState?.confirmText}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
