import { useEffect, useMemo, useState } from 'react';
import MetricCard from '../components/MetricCard';
import ConfirmModal from '../components/ConfirmModal';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Bath,
  BedDouble,
  Building,
  CalendarDays,
  CheckCircle,
  Clock,
  Clock3,
  FileText,
  Home,
  ImageIcon,
  Layers3,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Square,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';

const PROPERTY_TYPES = ['House', 'Condo', 'Lot', 'Apartment', 'Townhouse', 'Commercial'];
const PROPERTY_STATUSES = ['Draft', 'Available', 'Sold', 'Rented', 'Inactive'];
const AGENT_ALLOWED_STATUSES = ['Draft', 'Available', 'Sold', 'Rented'];
const WEEKDAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FEATURED_IMAGE_MAX_SIZE_BYTES = 25 * 1024 * 1024;
const FEATURED_IMAGE_MIN_WIDTH = 1200;
const FEATURED_IMAGE_MIN_HEIGHT = 675;
const FEATURED_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const emptyPropertyForm = {
  title: '',
  description: '',
  property_type: PROPERTY_TYPES[0],
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
  amenity_ids: [],
};

function createFallbackDashboard(profile) {
  return {
    role: 'agent',
    stats: {},
    profile: profile || null,
    properties: [],
    recent_inquiries: [],
  };
}

function mapPropertyToFormValues(property) {
  if (!property) {
    return emptyPropertyForm;
  }

  return {
    title: property.title || '',
    description: property.description || '',
    property_type: property.property_type || PROPERTY_TYPES[0],
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

function buildPropertyPayload(values) {
  const formData = new FormData();
  const appendValue = (key, value) => {
    if (value === '' || value === null || value === undefined) {
      return;
    }

    formData.append(key, String(value));
  };

  appendValue('title', values.title.trim());
  appendValue('description', values.description.trim());
  appendValue('property_type', values.property_type);
  appendValue('price', values.price === '' ? null : Number(values.price));
  appendValue('bedrooms', values.bedrooms === '' ? null : Number(values.bedrooms));
  appendValue('bathrooms', values.bathrooms === '' ? null : Number(values.bathrooms));
  appendValue('parking_spaces', values.parking_spaces === '' ? null : Number(values.parking_spaces));
  appendValue('area_sqm', values.area_sqm === '' ? null : Number(values.area_sqm));
  appendValue('address_line', values.address_line.trim());
  appendValue('city', values.city.trim());
  appendValue('province', values.province.trim());
  appendValue('status', values.status || null);

  values.amenity_ids.forEach((amenityId) => {
    formData.append('amenity_ids[]', String(Number(amenityId)));
  });

  if (values.featured_image_file) {
    formData.append('featured_image_upload', values.featured_image_file);
  }

  return formData;
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

function mapValidationErrors(details) {
  if (!details) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(details).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages]),
  );
}

function getFieldError(fieldErrors, fieldName) {
  return fieldErrors[fieldName] || Object.entries(fieldErrors).find(([key]) => key.startsWith(`${fieldName}.`))?.[1] || '';
}

function formatPrice(price) {
  const numericValue = Number(price || 0);
  return `PHP ${numericValue.toLocaleString()}`;
}

function formatListedAt(value) {
  if (!value) {
    return 'Recently updated';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getApprovalCopy(status) {
  if (status === 'suspended') {
    return 'Your agent profile is currently suspended. Property management actions are disabled until an administrator restores approval.';
  }

  return 'Your agent profile is still pending review. Listings can be managed here as soon as an administrator approves your account.';
}

function AgentPropertyForm({
  amenities,
  busy,
  fieldErrors,
  formMessage,
  initialProperty,
  mode,
  onCancel,
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

      {formMessage ? (
        <p className="inline-message" role="status">
          <AlertCircle size={18} aria-hidden="true" />
          {formMessage}
        </p>
      ) : null}

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

export default function DashboardPage() {
  const { authFetch, loading, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [message, setMessage] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [agentProperties, setAgentProperties] = useState([]);
  const [agentPropertiesLoading, setAgentPropertiesLoading] = useState(false);
  const [agentFormMode, setAgentFormMode] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [agentFormBusy, setAgentFormBusy] = useState(false);
  const [agentFormMessage, setAgentFormMessage] = useState('');
  const [agentFormErrors, setAgentFormErrors] = useState({});
  const [agentMessage, setAgentMessage] = useState('');
  const [agentAvailability, setAgentAvailability] = useState([]);
  const [agentAvailabilityBusy, setAgentAvailabilityBusy] = useState(false);
  const [agentScheduleSaving, setAgentScheduleSaving] = useState(false);
  const [agentBookings, setAgentBookings] = useState([]);
  const [agentBookingsBusy, setAgentBookingsBusy] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');

  const loadAdminOverview = useMemo(() => {
    return async (uSearch = '', aSearch = '', pSearch = '') => {
      try {
        const params = new URLSearchParams();
        if (uSearch) params.append('user_search', uSearch);
        if (aSearch) params.append('agent_search', aSearch);
        if (pSearch) params.append('property_search', pSearch);
        
        const overview = await authFetch(`/admin/overview?${params.toString()}`);
        setAdminOverview(overview);
      } catch (error) {
        setMessage(error.message);
      }
    };
  }, [authFetch]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    const timer = setTimeout(() => {
      loadAdminOverview(userSearch, agentSearch, propertySearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [userSearch, agentSearch, propertySearch, user?.role, loadAdminOverview]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let ignore = false;

    const loadDashboard = async () => {
      try {
        const dashboardData = await authFetch('/dashboard');
        if (ignore) {
          return;
        }

        setDashboard(dashboardData);

        if (user.role === 'agent') {
          setAgentProperties(dashboardData.properties || []);
        }

        if (user.role === 'admin') {
          await loadAdminOverview(userSearch, agentSearch, propertySearch);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (user.role === 'agent' && error.status === 403) {
          setDashboard(createFallbackDashboard(user.agent_profile));
          setAgentProperties([]);
          return;
        }

        setMessage(error.message);
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [authFetch, user, loadAdminOverview]);

  useEffect(() => {
    if (user?.role !== 'agent') {
      return;
    }

    let ignore = false;
    apiRequest('/amenities')
      .then((data) => {
        if (!ignore) {
          setAmenities(data.data || []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAmenities([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  const agentProfile = dashboard?.profile || user?.agent_profile || null;
  const isApprovedAgent = user?.role === 'agent' && agentProfile?.approval_status === 'approved';

  useEffect(() => {
    if (!isApprovedAgent) {
      setAgentProperties([]);
      return;
    }

    let ignore = false;
    setAgentPropertiesLoading(true);

    authFetch('/agent/properties')
      .then((data) => {
        if (!ignore) {
          setAgentProperties(data.data || []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setAgentMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setAgentPropertiesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, isApprovedAgent]);

  useEffect(() => {
    if (!isApprovedAgent) {
      setAgentAvailability([]);
      setAgentBookings([]);
      return;
    }

    let ignore = false;
    setAgentAvailabilityBusy(true);
    setAgentBookingsBusy(true);

    authFetch('/agent/availability')
      .then((data) => {
        if (!ignore) {
          setAgentAvailability(data.data || []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setAgentMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setAgentAvailabilityBusy(false);
        }
      });

    authFetch('/agent/viewings')
      .then((data) => {
        if (!ignore) {
          setAgentBookings(data.data || []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setAgentMessage(error.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setAgentBookingsBusy(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, isApprovedAgent]);

  const updateAdminRecord = async (path, body) => {
    const data = await authFetch(path, { method: 'PATCH', body });
    setMessage(data.message);
    if (user?.role === 'admin') {
      const [nextDashboard] = await Promise.all([
        authFetch('/dashboard'),
        loadAdminOverview(userSearch, agentSearch, propertySearch),
      ]);
      setDashboard(nextDashboard);
    }
  };

  const openAdminConfirm = ({ body, message: confirmMessage, path, title, tone = 'warning' }) => {
    setConfirmState({
      title,
      message: confirmMessage,
      tone,
      onConfirm: async () => {
        try {
          await updateAdminRecord(path, body);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const refreshAgentWorkspace = async () => {
    const nextDashboard = await authFetch('/dashboard');
    setDashboard(nextDashboard);

    if (nextDashboard.profile?.approval_status === 'approved') {
      const nextProperties = await authFetch('/agent/properties');
      setAgentProperties(nextProperties.data || []);
      return;
    }

    setAgentProperties([]);
  };

  const openCreateForm = () => {
    setAgentFormMode('create');
    setEditingProperty(null);
    setAgentFormErrors({});
    setAgentFormMessage('');
  };

  const openEditForm = (property) => {
    setAgentFormMode('edit');
    setEditingProperty(property);
    setAgentFormErrors({});
    setAgentFormMessage('');
  };

  const closeAgentForm = () => {
    setAgentFormMode(null);
    setEditingProperty(null);
    setAgentFormErrors({});
    setAgentFormMessage('');
  };

  const handlePropertySubmit = async (values) => {
    setAgentFormBusy(true);
    setAgentFormErrors({});
    setAgentFormMessage('');
    setAgentMessage('');

    try {
      const payload = buildPropertyPayload(values);

      if (agentFormMode === 'edit') {
        payload.append('_method', 'PUT');
      }

      const response = await authFetch(
        agentFormMode === 'edit' ? `/agent/properties/${editingProperty.property_id}` : '/agent/properties',
        {
          method: 'POST',
          body: payload,
        },
      );

      await refreshAgentWorkspace();
      setAgentMessage(response.message);
      closeAgentForm();
    } catch (error) {
      if (error.details) {
        setAgentFormErrors(mapValidationErrors(error.details));
        setAgentFormMessage('Review the highlighted fields and submit again.');
      } else {
        setAgentFormMessage(error.message);
      }
    } finally {
      setAgentFormBusy(false);
    }
  };

  const handleDeleteProperty = (property) => {
    setConfirmState({
      title: 'Delete Property Listing',
      message: `Delete "${property.title}" from your dashboard inventory? This action cannot be undone.`,
      tone: 'danger',
      confirmText: 'Delete Listing',
      onConfirm: async () => {
        try {
          const response = await authFetch(`/agent/properties/${property.property_id}`, { method: 'DELETE' });
          await refreshAgentWorkspace();
          if (editingProperty?.property_id === property.property_id) {
            closeAgentForm();
          }
          setAgentMessage(response.message);
        } catch (error) {
          setAgentMessage(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const addAvailabilityRow = () => {
    setAgentAvailability((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        day_of_week: 1,
        day_label: 'Monday',
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      },
    ]);
  };

  const updateAvailabilityRow = (targetId, field, value) => {
    setAgentAvailability((current) => current.map((entry) => {
      if (entry.id !== targetId) {
        return entry;
      }

      return {
        ...entry,
        [field]: value,
        ...(field === 'day_of_week' ? { day_label: WEEKDAY_OPTIONS[Number(value)] } : {}),
      };
    }));
  };

  const removeAvailabilityRow = (targetId) => {
    setAgentAvailability((current) => current.filter((entry) => entry.id !== targetId));
  };

  const saveAvailability = async () => {
    setAgentScheduleSaving(true);
    try {
      const response = await authFetch('/agent/availability', {
        method: 'PUT',
        body: {
          availability: agentAvailability.map((entry) => ({
            day_of_week: Number(entry.day_of_week),
            start_time: entry.start_time,
            end_time: entry.end_time,
            is_active: entry.is_active,
          })),
        },
      });
      setAgentAvailability(response.data || []);
      setAgentMessage(response.message);
    } catch (error) {
      setAgentMessage(error.message);
    } finally {
      setAgentScheduleSaving(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await authFetch(`/agent/viewings/${bookingId}`, {
        method: 'PATCH',
        body: { status },
      });
      setAgentBookings((current) => current.map((entry) => (
        entry.booking_id === bookingId ? response.data : entry
      )));
      setAgentMessage(response.message);
    } catch (error) {
      setAgentMessage(error.message);
    }
  };

  if (loading) {
    return <p className="empty-copy"><Clock3 size={24} className="notification-popup-icon" /> Authenticating your session...</p>;
  }

  if (!user) {
    return <p className="empty-copy"><AlertCircle size={24} className="notification-popup-icon" /> Secure authentication required to view this dashboard.</p>;
  }

  if (!dashboard) {
    return <p className="empty-copy"><Clock3 size={24} className="notification-popup-icon" /> Assembling secure dashboard data...</p>;
  }

  // Pre-map icons for common metric labels
  const metricIcons = {
    total_users: Users,
    total_agents: UserCheck,
    total_properties: Building,
    pending_agents: Clock,
    draft_properties: FileText,
    available_properties: CheckCircle,
    active_inquiries: Mail,
    saved_properties: Save,
    approved: CheckCircle,
  };

  const getMetricIcon = (label) => {
    return metricIcons[label.toLowerCase().replace(/ /g, '_')] || ShieldCheck;
  };

  const statsEntries = Object.entries(dashboard.stats || {});

  return (
    <div className="page-grid dashboard-grid animate-enter">
      <section className="section-panel dashboard-hero animate-delay-1">
        <p className="eyebrow">Personalized Dashboard</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--brand-base)', marginBottom: '0.5rem' }}>
          Welcome, {user.full_name}
        </h2>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 300 }}>
          <ShieldCheck size={18} color="var(--primary-base)" aria-hidden="true" />
          Clearance Level: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</strong>
        </p>
        
        {message ? (
          <p className="inline-message animate-enter" style={{ marginTop: '1.5rem', marginBottom: 0 }} role="status">
            {message}
          </p>
        ) : null}
        
        {statsEntries.length > 0 ? (
          <div className="metrics-grid">
            {statsEntries.map(([label, value], index) => {
              const cleanLabel = label.replace(/_/g, ' ');
              const Icon = getMetricIcon(label);
              return (
                <div key={label} className={`animate-enter animate-delay-${(index % 3) + 1}`}>
                  <MetricCard
                    label={cleanLabel}
                    tone={index % 2 ? 'accent' : 'default'}
                    value={value}
                    icon={Icon}
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {user.role === 'user' ? (
        <>
          <section className="section-panel animate-enter animate-delay-2">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Save size={14} aria-hidden="true" /> Curated Collection</p>
            <h2>Saved Properties</h2>
            <div className="list-stack">
              {(dashboard.saved_properties || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>You haven't saved any properties yet.</p>}
              {(dashboard.saved_properties || []).map((property) => (
                <div className="list-card" key={property.property_id}>
                  <strong>{property.title}</strong>
                  <span>{property.city}, {property.province}</span>
                </div>
              ))}
            </div>
          </section>
          
          <section className="section-panel animate-enter animate-delay-3">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Mail size={14} aria-hidden="true" /> Communications</p>
            <h2>Inquiry History</h2>
            <div className="list-stack">
              {(dashboard.recent_inquiries || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>No recent inquiries.</p>}
              {(dashboard.recent_inquiries || []).map((entry) => (
                 <div className="list-card" key={entry.inquiry_id}>
                  <strong>{entry.property?.title}</strong>
                  <span style={{ color: 'var(--brand-base)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 500 }}>{entry.status}</span>
                  <p style={{ margin: 0, fontWeight: 300, fontStyle: 'italic', color: 'var(--text-light)', lineHeight: 1.6 }}>"{entry.message}"</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {user.role === 'agent' ? (
        <>
          <section className="section-panel animate-enter animate-delay-2">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><UserCheck size={14} aria-hidden="true" /> Agent Profile</p>
            <h2>{agentProfile?.agency_name || 'Independent Agent'}</h2>
            <p className="property-copy" style={{ fontSize: '1rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>{agentProfile?.bio || 'No biography provided.'}</p>
            <div className="flex-row" style={{ color: 'var(--text-muted)' }}>
              <span>Authorization Status:</span>
              <span style={{
                color: agentProfile?.approval_status === 'approved'
                  ? 'var(--status-success)'
                  : agentProfile?.approval_status === 'suspended'
                    ? 'var(--status-danger)'
                    : 'var(--status-warning)',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                }}>
                {agentProfile?.approval_status || 'Pending'}
              </span>
            </div>
          </section>
          
          <section className="section-panel animate-enter animate-delay-3">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><CalendarDays size={14} aria-hidden="true" /> Viewing Calendar</p>
            <h2>Booked Viewings</h2>
            <div className="list-stack">
              {agentBookingsBusy ? <p className="empty-copy" style={{ padding: '2rem' }}>Loading scheduled appointments...</p> : null}
              {!agentBookingsBusy && agentBookings.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No viewings are booked yet.</p> : null}
              {!agentBookingsBusy && agentBookings.map((entry) => (
                <div className="list-card" key={entry.booking_id}>
                  <strong>{entry.property?.title}</strong>
                  <span style={{ color: 'var(--primary-base)' }}>
                    {entry.buyer_name} · {new Date(entry.scheduled_start).toLocaleString()}
                  </span>
                  <p style={{ marginTop: '0.75rem', fontWeight: 300, lineHeight: 1.6 }}>
                    {entry.notes || 'No viewing notes provided.'}
                  </p>
                  <div className="table-actions" style={{ marginTop: '1rem' }}>
                    <select
                      aria-label={`Update booking status for ${entry.property?.title}`}
                      value={entry.status}
                      onChange={(event) => updateBookingStatus(entry.booking_id, event.target.value)}
                    >
                      {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="section-panel animate-enter">
            <div className="agent-manager-header">
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Clock3 size={14} aria-hidden="true" /> Availability</p>
                <h2>Weekly Schedule</h2>
                <p className="agent-manager-copy">Buyers book 30-minute viewing slots from the time blocks you publish here.</p>
              </div>
              {isApprovedAgent ? (
                <button className="ghost-button" onClick={addAvailabilityRow} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Add Slot Block
                </button>
              ) : null}
            </div>

            {isApprovedAgent && agentAvailabilityBusy ? <p className="empty-copy" style={{ padding: '2rem' }}>Loading agent schedule...</p> : null}

            {isApprovedAgent && !agentAvailabilityBusy ? (
              <>
                <div className="agent-schedule-stack">
                  {agentAvailability.map((entry) => (
                    <div className="agent-schedule-row" key={entry.id}>
                      <select value={entry.day_of_week} onChange={(event) => updateAvailabilityRow(entry.id, 'day_of_week', Number(event.target.value))}>
                        {WEEKDAY_OPTIONS.map((day, index) => (
                          <option key={day} value={index}>{day}</option>
                        ))}
                      </select>
                      <input type="time" value={entry.start_time} onChange={(event) => updateAvailabilityRow(entry.id, 'start_time', event.target.value)} />
                      <input type="time" value={entry.end_time} onChange={(event) => updateAvailabilityRow(entry.id, 'end_time', event.target.value)} />
                      <button className="danger-button" onClick={() => removeAvailabilityRow(entry.id)} type="button">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="agent-form-actions">
                  <button className="primary-button" disabled={agentScheduleSaving || agentAvailability.length === 0} onClick={saveAvailability} type="button">
                    {agentScheduleSaving ? 'Saving Schedule...' : 'Save Schedule'}
                  </button>
                </div>
              </>
            ) : null}
          </section>

          <section className="section-panel agent-manager-panel animate-enter">
            <div className="agent-manager-header">
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Home size={14} aria-hidden="true" /> My Listings</p>
                <h2>Property Management Workspace</h2>
                <p className="agent-manager-copy">
                  Create, update, and retire your own listings directly from the dashboard.
                </p>
              </div>

              {isApprovedAgent ? (
                <button className="primary-button" onClick={openCreateForm} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Add Property
                </button>
              ) : (
                <span className={`property-status status-${(agentProfile?.approval_status || 'draft').toLowerCase()}`}>
                  {agentProfile?.approval_status || 'Pending'}
                </span>
              )}
            </div>

            {agentMessage ? (
              <p className="inline-message" role="status">
                <CheckCircle size={18} aria-hidden="true" />
                {agentMessage}
              </p>
            ) : null}

            {!isApprovedAgent ? (
              <div className="agent-approval-notice">
                <AlertCircle size={20} aria-hidden="true" />
                <div>
                  <strong>Listing management is unavailable.</strong>
                  <p>{getApprovalCopy(agentProfile?.approval_status)}</p>
                </div>
              </div>
            ) : null}

            {isApprovedAgent && agentFormMode ? (
              <AgentPropertyForm
                key={`${agentFormMode}-${editingProperty?.property_id || 'new'}`}
                amenities={amenities}
                busy={agentFormBusy}
                fieldErrors={agentFormErrors}
                formMessage={agentFormMessage}
                initialProperty={editingProperty}
                mode={agentFormMode}
                onCancel={closeAgentForm}
                onSubmit={handlePropertySubmit}
              />
            ) : null}

            {isApprovedAgent && agentPropertiesLoading && agentProperties.length === 0 ? (
              <div className="agent-listings-grid">
                {[1, 2, 3].map((entry) => (
                  <div className="agent-listing-card agent-listing-card-skeleton" key={entry} />
                ))}
              </div>
            ) : null}

            {isApprovedAgent && (!agentPropertiesLoading || agentProperties.length > 0) ? (
              agentProperties.length > 0 ? (
                <div className="agent-listings-grid">
                  {agentProperties.map((property) => (
                    <article className="agent-listing-card" key={property.property_id}>
                      <div
                        className="agent-listing-media"
                        style={property.featured_image ? { backgroundImage: `linear-gradient(rgba(6, 9, 14, 0.2), rgba(6, 9, 14, 0.75)), url(${property.featured_image})` } : undefined}
                      >
                        <span className="property-type">{property.property_type}</span>
                        <span className={`property-status status-${property.status.toLowerCase()}`}>{property.status}</span>
                      </div>

                      <div className="agent-listing-body">
                        <div className="agent-listing-heading">
                          <div>
                            <h3>{property.title}</h3>
                            <p className="property-loc">
                              <MapPin size={14} aria-hidden="true" />
                              {property.city}, {property.province}
                            </p>
                          </div>
                          <strong className="property-price">{formatPrice(property.price)}</strong>
                        </div>

                        <p className="agent-listing-copy">{property.description}</p>

                        <div className="agent-listing-meta">
                          <span><BedDouble size={15} aria-hidden="true" /> {property.bedrooms ?? 'N/A'} bed</span>
                          <span><Bath size={15} aria-hidden="true" /> {property.bathrooms ?? 'N/A'} bath</span>
                          <span><Layers3 size={15} aria-hidden="true" /> {property.parking_spaces ?? 'N/A'} parking</span>
                          <span><Square size={15} aria-hidden="true" /> {property.area_sqm ?? 'N/A'} sqm</span>
                        </div>

                        <div className="agent-listing-footer">
                          <div className="chip-row" style={{ marginBottom: 0 }}>
                            {(property.amenities || []).slice(0, 4).map((amenity) => (
                              <span className="chip" key={amenity.amenity_id}>{amenity.amenity_name}</span>
                            ))}
                            {(property.amenities || []).length > 4 ? <span className="chip">+{property.amenities.length - 4}</span> : null}
                          </div>

                          <div className="agent-listing-submeta">
                            <span><ImageIcon size={14} aria-hidden="true" /> {property.featured_image ? 'Image linked' : 'No image'}</span>
                            <span>Listed {formatListedAt(property.listed_at || property.created_at)}</span>
                          </div>
                        </div>

                        <div className="agent-listing-actions">
                          <button className="ghost-button" onClick={() => openEditForm(property)} type="button">
                            <Pencil size={15} aria-hidden="true" />
                            Edit
                          </button>
                          <button className="danger-button" onClick={() => handleDeleteProperty(property)} type="button">
                            <Trash2 size={15} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  <Building size={22} aria-hidden="true" />
                  No listings yet. Add your first property to start receiving inquiries from the dashboard.
                </p>
              )
            ) : null}
          </section>
        </>
      ) : null}

      {user.role === 'admin' && adminOverview ? (
        <>
          <section className="section-panel admin-panel animate-enter animate-delay-2">
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Users size={14} aria-hidden="true" /> Directory</p>
                <h2 style={{ margin: 0 }}>System Users</h2>
              </div>
              <div style={{ minWidth: '300px' }}>
                <input
                  aria-label="Search users by name or email"
                  placeholder="Search users by name or email..."
                  type="text"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  style={{ marginTop: 0 }}
                />
              </div>
            </div>
            
            <div className="table-stack">
              {adminOverview.users.length === 0 && <p className="empty-copy">No users match your search.</p>}
              {adminOverview.users.map((entry) => (
                <div className="table-row" key={entry.id}>
                  <div>
                    <strong>{entry.full_name}</strong>
                    <span>{entry.email}</span>
                  </div>
                  <div className="table-actions">
                    <span className="chip" style={{ background: 'var(--primary-light)', color: 'var(--primary-base)', borderColor: 'var(--primary-base)' }}>
                      {entry.role}
                    </span>
                    <button
                      className={entry.is_active ? 'ghost-button' : 'primary-button'}
                      aria-label={entry.is_active ? `Suspend ${entry.full_name}` : `Restore ${entry.full_name}`}
                      disabled={entry.role === 'admin' && entry.is_active}
                      onClick={() => openAdminConfirm({
                        title: entry.is_active ? 'Suspend User Access' : 'Restore User Access',
                        message: `Are you sure you want to ${entry.is_active ? 'suspend' : 'restore'} access for ${entry.full_name}?`,
                        path: `/admin/users/${entry.id}`,
                        body: { is_active: !entry.is_active },
                        tone: entry.is_active ? 'danger' : 'warning',
                      })}
                      type="button"
                    >
                      {entry.is_active ? 'Suspend Access' : 'Restore Access'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="section-panel admin-panel animate-enter animate-delay-3">
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><UserCheck size={14} aria-hidden="true" /> Approvals</p>
                <h2 style={{ margin: 0 }}>Agent Authorizations</h2>
              </div>
              <div style={{ minWidth: '300px' }}>
                <input
                  aria-label="Search agents by name or agency"
                  placeholder="Search agents by name or agency..."
                  type="text"
                  value={agentSearch}
                  onChange={(event) => setAgentSearch(event.target.value)}
                  style={{ marginTop: 0 }}
                />
              </div>
            </div>

            <div className="table-stack">
              {adminOverview.agents.length === 0 && <p className="empty-copy">No agents match your search or pending review.</p>}
              {adminOverview.agents.map((entry) => (
                <div className="table-row" key={entry.agent_id}>
                  <div>
                    <strong>{entry.full_name}</strong>
                    <span>{entry.agency_name}</span>
                  </div>
                  <div className="table-actions">
                    <select
                      value={entry.approval_status}
                      aria-label={`Update authorization for ${entry.full_name}`}
                      onChange={(event) => openAdminConfirm({
                        title: 'Update Agent Status',
                        message: `Are you sure you want to change ${entry.full_name}'s status to ${event.target.value}?`,
                        path: `/admin/agents/${entry.agent_id}`,
                        body: { approval_status: event.target.value },
                        tone: 'warning',
                      })}
                    >
                      <option value="pending">Pending Review</option>
                      <option value="approved">Approved</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="section-panel admin-panel animate-enter">
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Building size={14} aria-hidden="true" /> Inventory</p>
                <h2 style={{ margin: 0 }}>Property Status Review</h2>
              </div>
              <div style={{ minWidth: '300px' }}>
                <input
                  aria-label="Search properties by title or location"
                  placeholder="Search properties by title or location..."
                  type="text"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  style={{ marginTop: 0 }}
                />
              </div>
            </div>

            <div className="table-stack">
              {adminOverview.properties.length === 0 && <p className="empty-copy">No properties match your search or needing review.</p>}
              {adminOverview.properties.map((entry) => (
                <div className="table-row" key={entry.property_id}>
                  <div>
                    <strong>{entry.title}</strong>
                    <span>{entry.city}, {entry.province}</span>
                  </div>
                  <div className="table-actions">
                    <select
                      value={entry.status}
                      aria-label={`Update status for ${entry.title}`}
                      onChange={(event) => openAdminConfirm({
                        title: 'Update Property Status',
                        message: `Change the status of "${entry.title}" to ${event.target.value}?`,
                        path: `/admin/properties/${entry.property_id}`,
                        body: { status: event.target.value },
                        tone: 'warning',
                      })}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Available">Available</option>
                      <option value="Sold">Sold</option>
                      <option value="Rented">Rented</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

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
