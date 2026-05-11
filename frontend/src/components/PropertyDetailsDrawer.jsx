import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, X, ImageIcon, Calendar, ChevronRight } from 'lucide-react';
import { apiRequest } from '../api/client';

function formatPrice(property) {
  const amount = Number(property.price || 0).toLocaleString();
  return property.listing_purpose === 'rent' ? `PHP ${amount}/mo` : `PHP ${amount}`;
}

export default function PropertyDetailsDrawer({ property, onClose, onInquire, onBookViewing, onSelectProperty }) {
  const [fullProperty, setFullProperty] = useState(null);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!property?.property_id) {
      setFullProperty(null);
      setSimilarProperties([]);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await apiRequest(`/properties/${property.property_id}`);
        setFullProperty(response.data);
        setSimilarProperties(response.similar_properties || []);
        
        // Scroll to top when property changes
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      } catch (error) {
        console.error('Failed to fetch property details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [property?.property_id]);

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

  const displayProperty = fullProperty || property;
  const isAvailable = displayProperty.status?.toLowerCase() === 'available';

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

        <div className="drawer-content" ref={contentRef}>
          {displayProperty.featured_image ? (
            <img
              src={displayProperty.featured_image}
              alt={`Exterior view of ${displayProperty.title}`}
              style={{ width: '100%', height: '320px', objectFit: 'cover', borderRadius: 'var(--radius-xl)', marginBottom: '2.5rem', boxShadow: 'var(--shadow-md)' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              loading="lazy"
            />
          ) : null}
          <div className="empty-copy" style={{ display: displayProperty.featured_image ? 'none' : 'flex', height: '320px', marginBottom: '2.5rem', padding: 0 }}>
            <ImageIcon size={48} aria-hidden="true" />
            <span>Image not available</span>
          </div>

          <h2 id="drawer-title" style={{ fontSize: '2.2rem', fontWeight: 300, marginBottom: '0.5rem', lineHeight: 1.2 }}>{displayProperty.title}</h2>
          <p className="detail-price">{formatPrice(displayProperty)}</p>

          <div className="chip-row detail-chip-row">
            {(displayProperty.amenities || []).map((amenity) => (
              <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
            ))}
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontWeight: 300, fontSize: '1.05rem', margin: '2rem 0' }}>{displayProperty.description}</p>

          <dl className="detail-grid">
            <div><dt>Address</dt><dd>{displayProperty.address_line || 'Provided upon booking confirmation'}</dd></div>
            <div><dt>Location</dt><dd>{displayProperty.city}, {displayProperty.province}</dd></div>
            <div><dt>Bedrooms</dt><dd>{displayProperty.bedrooms}</dd></div>
            <div><dt>Bathrooms</dt><dd>{displayProperty.bathrooms}</dd></div>
            <div><dt>Parking</dt><dd>{displayProperty.parking_spaces ?? 0}</dd></div>
            <div><dt>Listing Type</dt><dd>{displayProperty.listing_purpose === 'rent' ? 'For Rent' : 'For Sale'}</dd></div>
            <div>
              <dt>Represented By</dt>
              <dd>
                <Link className="text-link" to="/agents">{displayProperty.agent?.full_name}</Link>
              </dd>
            </div>
            <div><dt>Status</dt><dd style={{ color: displayProperty.status === 'Available' ? 'var(--status-success)' : 'var(--text-main)' }}>{displayProperty.status}</dd></div>
          </dl>
          
          {isAvailable ? (
            <div className="flex-row" style={{ gap: '1rem', marginTop: '1rem' }}>
              {onInquire && (
                <button
                  className="ghost-button detail-submit"
                  onClick={() => onInquire(displayProperty)}
                  type="button"
                  aria-label={`Email agent for ${displayProperty.title}`}
                  style={{ flex: 1 }}
                >
                  <Mail size={18} aria-hidden="true" />
                  Email Agent
                </button>
              )}
              <button
                className="primary-button detail-submit"
                onClick={() => onBookViewing && onBookViewing(displayProperty)}
                type="button"
                aria-label={`Book viewing for ${displayProperty.title}`}
                style={{ flex: 1.5 }}
              >
                <Calendar size={18} aria-hidden="true" />
                Book Viewing
              </button>
            </div>
          ) : null}

          {!loading && similarProperties.length > 0 && (
            <div className="similar-listings-section" style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                Similar Listings
                <ChevronRight size={20} style={{ opacity: 0.3 }} />
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {similarProperties.map((similar, idx) => (
                  <div 
                    key={similar.property_id} 
                    className={`animate-enter animate-delay-${(idx % 2) + 1}`}
                    onClick={() => onSelectProperty && onSelectProperty(similar)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', height: '140px', marginBottom: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
                      <img 
                        src={similar.featured_image} 
                        alt={similar.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 500, margin: '0 0 0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {similar.title}
                    </h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>
                      {formatPrice(similar)}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', opacity: 0.8, marginTop: '0.2rem' }}>
                      {similar.city}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
