import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ImageIcon } from 'lucide-react';

function formatPrice(property) {
  const amount = Number(property.price || 0).toLocaleString();
  return property.listing_purpose === 'rent' ? `PHP ${amount}/mo` : `PHP ${amount}`;
}

export default function PropertyDetailsDrawer({ property, onClose }) {
  // Handle Escape key to close the drawer
  useEffect(() => {
    if (!property) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [property, onClose]);

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
          <p className="detail-price">{formatPrice(property)}</p>

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
            <div><dt>Parking</dt><dd>{property.parking_spaces ?? 0}</dd></div>
            <div><dt>Listing Type</dt><dd>{property.listing_purpose === 'rent' ? 'For Rent' : 'For Sale'}</dd></div>
            <div>
              <dt>Represented By</dt>
              <dd>
                <Link className="text-link" to="/agents">{property.agent?.full_name}</Link>
              </dd>
            </div>
            <div><dt>Status</dt><dd style={{ color: property.status === 'Available' ? 'var(--status-success)' : 'var(--text-main)' }}>{property.status}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
