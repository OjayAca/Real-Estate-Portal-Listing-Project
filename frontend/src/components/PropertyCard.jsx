import { MapPin, BedDouble, Bath, Square, ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';

export default function PropertyCard({ property, onInquire, onSave, onView, saved }) {
  const isAvailable = property.status.toLowerCase() === 'available';

  return (
    <article className="property-card" onClick={() => onView(property)}>
      <div
        className="property-visual"
        style={{ backgroundImage: `url(${property.featured_image || ''})` }}
      >
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
              <MapPin size={14} />
              {property.city}, {property.province}
            </p>
          </div>
        </div>
        
        <strong className="property-price">PHP {property.price.toLocaleString()}</strong>
        <p className="property-copy">{property.description}</p>
        
        <div className="property-meta">
          <span className="meta-item" title="Bedrooms">
            <BedDouble size={16} />
            {property.bedrooms} Bed
          </span>
          <span className="meta-item" title="Bathrooms">
            <Bath size={16} />
            {property.bathrooms} Bath
          </span>
          <span className="meta-item" title="Floor Area">
            <Square size={16} />
            {property.area_sqm || 'N/A'} sqm
          </span>
        </div>
        
        <div className="chip-row">
          {property.amenities.slice(0, 3).map((amenity) => (
            <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
          ))}
          {property.amenities.length > 3 && (
            <span className="chip">+{property.amenities.length - 3}</span>
          )}
        </div>
        
        <div className="property-actions" onClick={(e) => e.stopPropagation()}>
          <button className="ghost-button" onClick={() => onView(property)}>
            Details
          </button>
          {onSave && (
            <button className="ghost-button" onClick={() => onSave(property)} title={saved ? 'Remove saved property' : 'Save property'}>
              {saved ? <BookmarkCheck size={16} fill="currentColor" /> : <Bookmark size={16} />}
              {saved ? 'Saved' : 'Save'}
            </button>
          )}
          {onInquire && isAvailable && (
            <button className="primary-button" onClick={() => onInquire(property)}>
              Inquire
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
