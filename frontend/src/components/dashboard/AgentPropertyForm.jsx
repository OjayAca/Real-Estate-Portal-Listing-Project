import { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import InlineMessage from '../InlineMessage';

const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
const LISTING_PURPOSES = [
  { label: 'For Sale', value: 'sale' },
  { label: 'For Rent', value: 'rent' },
];
const AGENT_ALLOWED_STATUSES = ['Draft', 'Available', 'Pending Sold', 'Pending Rented'];
const FEATURED_IMAGE_MAX_SIZE_BYTES = 25 * 1024 * 1024;
const FEATURED_IMAGE_MIN_WIDTH = 1200;
const FEATURED_IMAGE_MIN_HEIGHT = 675;
const FEATURED_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const emptyPropertyForm = {
  title: '',
  description: '',
  property_type: PROPERTY_TYPES[0],
  listing_purpose: 'sale',
  price: '',
  bedrooms: '',
  bathrooms: '',
  parking_spaces: '',
  area_sqm: '',
  address_line: '',
  city: '',
  province: '',
  featured_image: '',
  featured_image_file: null,
  status: 'Draft',
  status_reason: '',
  amenity_ids: [],
};

function mapPropertyToFormValues(property) {
  if (!property) {
    return emptyPropertyForm;
  }

  return {
    title: property.title || '',
    description: property.description || '',
    property_type: property.property_type || PROPERTY_TYPES[0],
    listing_purpose: property.listing_purpose || 'sale',
    price: property.price ?? '',
    bedrooms: property.bedrooms ?? '',
    bathrooms: property.bathrooms ?? '',
    parking_spaces: property.parking_spaces ?? '',
    area_sqm: property.area_sqm ?? '',
    address_line: property.address_line || '',
    city: property.city || '',
    province: property.province || '',
    featured_image: property.featured_image || '',
    featured_image_file: null,
    status: property.status || 'Draft',
    amenity_ids: (property.amenities || []).map((amenity) => amenity.amenity_id),
  };
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The selected file could not be read as an image.'));
    };

    image.src = objectUrl;
  });
}

async function validateFeaturedImageFile(file) {
  if (!FEATURED_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
    return 'Upload a JPG, PNG, or WebP image.';
  }

  if (file.size > FEATURED_IMAGE_MAX_SIZE_BYTES) {
    return 'Image must be 25 MB or smaller.';
  }

  const { width, height } = await readImageDimensions(file);

  if (width < FEATURED_IMAGE_MIN_WIDTH || height < FEATURED_IMAGE_MIN_HEIGHT) {
    return `Image must be at least ${FEATURED_IMAGE_MIN_WIDTH} x ${FEATURED_IMAGE_MIN_HEIGHT} pixels.`;
  }

  return '';
}

function getFieldError(fieldErrors, fieldName) {
  return fieldErrors[fieldName] || Object.entries(fieldErrors).find(([key]) => key.startsWith(`${fieldName}.`))?.[1] || '';
}

export default function AgentPropertyForm({
  amenities,
  busy,
  fieldErrors,
  formMessage,
  formMessageTone,
  initialProperty,
  mode,
  onCancel,
  onMessageDismiss,
  onSubmit,
}) {
  const [values, setValues] = useState(() => mapPropertyToFormValues(initialProperty));
  const [imageSelectionError, setImageSelectionError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState(() => initialProperty?.featured_image || '');

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const amenityGroups = useMemo(() => {
    return amenities.reduce((groups, amenity) => {
      const category = amenity.amenity_category || 'Other';
      groups[category] = groups[category] || [];
      groups[category].push(amenity);
      return groups;
    }, {});
  }, [amenities]);

  const selectedAmenities = useMemo(() => {
    const selectedIds = new Set(values.amenity_ids);
    return amenities.filter((amenity) => selectedIds.has(amenity.amenity_id));
  }, [amenities, values.amenity_ids]);

  const updateValue = (field, nextValue) => {
    setValues((current) => ({ ...current, [field]: nextValue }));
  };

  const handleFeaturedImageChange = async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      updateValue('featured_image_file', null);
      setImagePreviewUrl(values.featured_image || '');
      setImageSelectionError('');
      return;
    }

    try {
      const validationMessage = await validateFeaturedImageFile(file);

      if (validationMessage) {
        event.target.value = '';
        updateValue('featured_image_file', null);
        setImageSelectionError(validationMessage);
        return;
      }

      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      setImagePreviewUrl(URL.createObjectURL(file));
      updateValue('featured_image_file', file);
      setImageSelectionError('');
    } catch (error) {
      event.target.value = '';
      updateValue('featured_image_file', null);
      setImageSelectionError(error.message);
    }
  };

  const toggleAmenity = (amenityId) => {
    setValues((current) => ({
      ...current,
      amenity_ids: current.amenity_ids.includes(amenityId)
        ? current.amenity_ids.filter((entry) => entry !== amenityId)
        : [...current.amenity_ids, amenityId],
    }));
  };

  return (
      <form
        className="agent-property-form animate-enter"
        onSubmit={(event) => {
          event.preventDefault();

          if (imageSelectionError) {
            return;
          }

          onSubmit(values);
        }}
      >
      <div className="agent-property-form-header">
        <div>
          <p className="eyebrow">{mode === 'edit' ? 'Update Listing' : 'Create Listing'}</p>
          <h3>{mode === 'edit' ? `Editing ${initialProperty?.title || 'Listing'}` : 'Add A New Property'}</h3>
          <p className="agent-property-form-copy">
            Keep listing details accurate so dashboard totals, inquiry context, and the public catalog stay in sync.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <InlineMessage
        icon={AlertCircle}
        message={formMessage}
        tone={formMessageTone}
        onDismiss={onMessageDismiss}
      />

      <div className="agent-form-section">
        <p className="eyebrow">Core Details</p>
        <div className="two-up agent-form-grid">
          <label>
            Title
            <input
              required
              value={values.title}
              onChange={(event) => updateValue('title', event.target.value)}
              placeholder="Enter listing headline"
            />
            {getFieldError(fieldErrors, 'title') ? <span className="field-error">{getFieldError(fieldErrors, 'title')}</span> : null}
          </label>

          <label>
            Property Type
            <select value={values.property_type} onChange={(event) => updateValue('property_type', event.target.value)}>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {getFieldError(fieldErrors, 'property_type') ? <span className="field-error">{getFieldError(fieldErrors, 'property_type')}</span> : null}
          </label>

          <label>
            Listing Purpose
            <select value={values.listing_purpose} onChange={(event) => updateValue('listing_purpose', event.target.value)}>
              {LISTING_PURPOSES.map((purpose) => (
                <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
              ))}
            </select>
            {getFieldError(fieldErrors, 'listing_purpose') ? <span className="field-error">{getFieldError(fieldErrors, 'listing_purpose')}</span> : null}
          </label>
        </div>

        <label>
          Description
          <textarea
            required
            rows={5}
            value={values.description}
            onChange={(event) => updateValue('description', event.target.value)}
            placeholder="Describe the property, highlights, and selling points."
          />
          {getFieldError(fieldErrors, 'description') ? <span className="field-error">{getFieldError(fieldErrors, 'description')}</span> : null}
        </label>
      </div>

      <div className="agent-form-section">
        <p className="eyebrow">Specs & Status</p>
        <div className="agent-form-grid agent-form-grid-4">
          <label>
            Price
            <input
              required
              min="1"
              step="0.01"
              type="number"
              value={values.price}
              onChange={(event) => updateValue('price', event.target.value)}
              placeholder="0.00"
            />
            {getFieldError(fieldErrors, 'price') ? <span className="field-error">{getFieldError(fieldErrors, 'price')}</span> : null}
          </label>

          <label>
            Bedrooms
            <input
              min="0"
              max="20"
              type="number"
              value={values.bedrooms}
              onChange={(event) => updateValue('bedrooms', event.target.value)}
              placeholder="0"
            />
            {getFieldError(fieldErrors, 'bedrooms') ? <span className="field-error">{getFieldError(fieldErrors, 'bedrooms')}</span> : null}
          </label>

          <label>
            Bathrooms
            <input
              min="0"
              max="20"
              type="number"
              value={values.bathrooms}
              onChange={(event) => updateValue('bathrooms', event.target.value)}
              placeholder="0"
            />
            {getFieldError(fieldErrors, 'bathrooms') ? <span className="field-error">{getFieldError(fieldErrors, 'bathrooms')}</span> : null}
          </label>

          <label>
            Parking Spaces
            <input
              min="0"
              max="20"
              type="number"
              value={values.parking_spaces}
              onChange={(event) => updateValue('parking_spaces', event.target.value)}
              placeholder="0"
            />
            {getFieldError(fieldErrors, 'parking_spaces') ? <span className="field-error">{getFieldError(fieldErrors, 'parking_spaces')}</span> : null}
          </label>

          <label>
            Area (sqm)
            <input
              min="0"
              type="number"
              value={values.area_sqm}
              onChange={(event) => updateValue('area_sqm', event.target.value)}
              placeholder="0"
            />
            {getFieldError(fieldErrors, 'area_sqm') ? <span className="field-error">{getFieldError(fieldErrors, 'area_sqm')}</span> : null}
          </label>

          <label>
            Status
            <select value={values.status} onChange={(event) => updateValue('status', event.target.value)}>
              {(() => {
                const isDraft = initialProperty?.status === 'Draft' || mode === 'create';
                let options = [...AGENT_ALLOWED_STATUSES];

                if (!isDraft) {
                  options = options.filter((s) => s !== 'Draft');
                }

                if (initialProperty?.status === 'Inactive' && !options.includes('Inactive')) {
                  options.push('Inactive');
                }

                return options.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ));
              })()}
            </select>
            {getFieldError(fieldErrors, 'status') ? <span className="field-error">{getFieldError(fieldErrors, 'status')}</span> : null}
            {values.status.startsWith('Pending') && (
              <div style={{ marginTop: '1rem', width: '100%', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Reason for status change
                  <textarea
                    rows={2}
                    value={values.status_reason}
                    onChange={(e) => updateValue('status_reason', e.target.value)}
                    placeholder="e.g., Buyer has signed the contract and paid the deposit."
                    style={{ marginTop: '0.5rem' }}
                  />
                </label>
                <span className="field-hint" style={{ color: 'var(--accent-base)', fontWeight: 500, marginTop: '0.5rem', display: 'block' }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Setting status to "{values.status}" requires administrator approval before it takes effect on the public portal.
                </span>
              </div>
            )}
          </label>
        </div>
      </div>

      <div className="agent-form-section">
        <p className="eyebrow">Location & Media</p>
        <div className="two-up agent-form-grid">
          <label>
            Address Line
            <input
              required
              value={values.address_line}
              onChange={(event) => updateValue('address_line', event.target.value)}
              placeholder="Street, building, or subdivision"
            />
            {getFieldError(fieldErrors, 'address_line') ? <span className="field-error">{getFieldError(fieldErrors, 'address_line')}</span> : null}
          </label>

          <label>
            City
            <input
              required
              value={values.city}
              onChange={(event) => updateValue('city', event.target.value)}
              placeholder="City"
            />
            {getFieldError(fieldErrors, 'city') ? <span className="field-error">{getFieldError(fieldErrors, 'city')}</span> : null}
          </label>

          <label>
            Province
            <input
              required
              value={values.province}
              onChange={(event) => updateValue('province', event.target.value)}
              placeholder="Province"
            />
            {getFieldError(fieldErrors, 'province') ? <span className="field-error">{getFieldError(fieldErrors, 'province')}</span> : null}
          </label>

          <label>
            Featured Image
            <input
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFeaturedImageChange}
              type="file"
            />
            <span className="field-hint">Upload JPG, PNG, or WebP. Minimum 1200 x 675, recommended 1600 x 900, max 25 MB. Oversized images are automatically optimized on upload.</span>
            {values.featured_image_file ? <span className="field-hint">Selected file: {values.featured_image_file.name}</span> : null}
            {!values.featured_image_file && values.featured_image ? <span className="field-hint">Uploading a new file will replace the current listing image.</span> : null}
            {imagePreviewUrl ? (
              <img
                alt="Featured property preview"
                src={imagePreviewUrl}
                style={{ width: '100%', maxWidth: '320px', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginTop: '0.85rem', boxShadow: 'var(--shadow-sm)' }}
                loading="lazy"
              />
            ) : null}
            {imageSelectionError ? <span className="field-error">{imageSelectionError}</span> : null}
            {getFieldError(fieldErrors, 'featured_image_upload') ? <span className="field-error">{getFieldError(fieldErrors, 'featured_image_upload')}</span> : null}
            {getFieldError(fieldErrors, 'featured_image') ? <span className="field-error">{getFieldError(fieldErrors, 'featured_image')}</span> : null}
          </label>
        </div>
      </div>

      <div className="agent-form-section">
        <div className="agent-form-section-header">
          <div>
            <p className="eyebrow">Amenities</p>
            <p className="agent-property-form-copy" style={{ margin: '0.35rem 0 0' }}>
              Select all applicable amenities for accurate property matching.
            </p>
          </div>
          <span className="result-count">{values.amenity_ids.length} selected</span>
        </div>

        {selectedAmenities.length ? (
          <div className="agent-amenity-selected">
            {selectedAmenities.map((amenity) => (
              <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
            ))}
          </div>
        ) : null}

        <div className="agent-amenity-groups">
          {Object.entries(amenityGroups).map(([category, entries]) => (
            <div className="agent-amenity-group" key={category}>
              <strong>{category}</strong>
              <div className="agent-amenity-options">
                {entries.map((amenity) => (
                  <label className="agent-amenity-option" key={amenity.amenity_id}>
                    <input
                      checked={values.amenity_ids.includes(amenity.amenity_id)}
                      onChange={() => toggleAmenity(amenity.amenity_id)}
                      type="checkbox"
                    />
                    <span>{amenity.amenity_name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {getFieldError(fieldErrors, 'amenity_ids') ? <span className="field-error">{getFieldError(fieldErrors, 'amenity_ids')}</span> : null}
      </div>

      <div className="agent-form-actions">
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" disabled={busy || Boolean(imageSelectionError)} type="submit">
          {busy ? (mode === 'edit' ? 'Saving Changes...' : 'Creating Listing...') : (mode === 'edit' ? 'Save Changes' : 'Create Listing')}
        </button>
      </div>
    </form>
  );
}
