import { MapPin, BedDouble, Bath, Square, Heart, Mail } from 'lucide-react';

export default function PropertyCard({ property, onInquire, onSave, onView, saved }) {
  const isAvailable = property.status.toLowerCase() === 'available';

  const handleCardClick = (e) => {
    // If the click is on a button (like Save or Email Agent), don't trigger the whole card view
    if (e.target.closest('button')) return;
    onView(property);
  };

  return (
    <article 
      className="property-card" 
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="property-visual">
        <div 
          className="property-visual-img" 
          style={{ backgroundImage: `url(${property.featured_image || ''})` }}
          aria-hidden="true"
        />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
          <span className="property-type">{property.property_type}</span>
          {onSave && (
            <button 
              className="icon-button" 
              onClick={(e) => { e.stopPropagation(); onSave(property); }} 
              title={saved ? 'Remove saved property' : 'Save property'}
              aria-label={saved ? `Remove ${property.title} from saved properties` : `Save ${property.title}`}
              style={{ 
                width: '36px', 
                height: '36px', 
                background: 'rgba(0,0,0,0.5)', 
                border: 'none', 
                color: saved ? '#ef4444' : '#fff',
                backdropFilter: 'blur(8px)'
              }}
            >
              <Heart size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}
        </div>
        <span className={`property-status status-${property.status.toLowerCase()}`} style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem' }}>
          {property.status}
        </span>
      </div>
      <div className="property-body">
        <div className="property-header-row">
          <div>
            <h3>{property.title}</h3>
            <p className="property-loc">
              <MapPin size={14} aria-hidden="true" />
              {property.city}, {property.province}
            </p>
          </div>
        </div>
        
        <strong className="property-price">PHP {property.price.toLocaleString()}</strong>
        <p className="property-copy">{property.description}</p>
        
        <div className="property-meta" aria-label="Property specifications">
          <span className="meta-item" title="Bedrooms">
            <BedDouble size={16} aria-hidden="true" />
            <span className="sr-only">Bedrooms: </span>{property.bedrooms} Bed
          </span>
          <span className="meta-item" title="Bathrooms">
            <Bath size={16} aria-hidden="true" />
            <span className="sr-only">Bathrooms: </span>{property.bathrooms} Bath
          </span>
          <span className="meta-item" title="Floor Area">
            <Square size={16} aria-hidden="true" />
            <span className="sr-only">Area: </span>{property.area_sqm || 'N/A'} sqm
          </span>
        </div>
        
        <div className="chip-row" aria-label="Amenities">
          {property.amenities.slice(0, 3).map((amenity) => (
            <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
          ))}
          {property.amenities.length > 3 && (
            <span className="chip">+{property.amenities.length - 3}</span>
          )}
        </div>
        
        {onInquire && isAvailable && (
          <div className="property-actions" style={{ marginTop: 'auto' }}>
            <button 
              className="primary-button" 
              onClick={(e) => { e.stopPropagation(); onInquire(property); }}
              aria-label={`Email agent for ${property.title}`}
              style={{ width: '100%' }}
            >
              <Mail size={18} aria-hidden="true" />
              Email Agent
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
