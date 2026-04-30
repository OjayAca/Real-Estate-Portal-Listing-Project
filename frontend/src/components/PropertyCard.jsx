import { MapPin, BedDouble, Bath, Square, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';

export default function PropertyCard({ property, onInquire, onSave, onView, saved }) {
  const isAvailable = property.status.toLowerCase() === 'available';

  return (
    <article 
      className="property-card" 
    >
      <div className="property-visual">
        <div 
          className="property-visual-img" 
          style={{ backgroundImage: `url(${property.featured_image || ''})` }}
          aria-hidden="true"
        />
        <span className="property-type">{property.property_type}</span>
        <span className={`property-status status-${property.status.toLowerCase()}`}>
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
        
        <div className="property-actions">
          <button 
            className="ghost-button" 
            onClick={() => onView(property)} 
            aria-label={`View full details for ${property.title}`}
            tabIndex={0}
          >
            Details
          </button>
          {onSave && (
            <button 
              className="ghost-button" 
              onClick={() => onSave(property)} 
              title={saved ? 'Remove saved property' : 'Save property'}
              aria-label={saved ? `Remove ${property.title} from saved properties` : `Save ${property.title}`}
            >
              {saved ? <BookmarkCheck size={16} fill="currentColor" aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
          {onInquire && isAvailable && (
            <button 
              className="primary-button" 
              onClick={() => onInquire(property)}
              aria-label={`Book a viewing for ${property.title}`}
            >
              Book Viewing
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
