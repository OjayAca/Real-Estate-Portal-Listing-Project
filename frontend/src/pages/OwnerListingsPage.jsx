import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Bath, Building, Clock3, Home, ImageIcon, Layers3, MapPin, Pencil, Plus, Square, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AgentPropertyForm from '../components/dashboard/AgentPropertyForm';
import ConfirmModal from '../components/ConfirmModal';
import InlineMessage from '../components/InlineMessage';
import InquiryManager from '../components/InquiryManager';
import ViewingRequestManager from '../components/ViewingRequestManager';

function formatPrice(property) {
  const amount = Number(property.price || 0).toLocaleString();
  return property.listing_purpose === 'rent' ? `PHP ${amount}/mo` : `PHP ${amount}`;
}

function formatListedAt(value) {
  if (!value) return 'Not listed yet';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OwnerListingsPage() {
  const { authFetch, loading, user } = useAuth();
  const navigate = useNavigate();
  const [amenities, setAmenities] = useState([]);
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [formMode, setFormMode] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formMessage, setFormMessage] = useState('');
  const [formMessageTone, setFormMessageTone] = useState('info');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [confirmState, setConfirmState] = useState(null);

  const loadProperties = useCallback(async () => {
    setPropertiesLoading(true);
    try {
      const data = await authFetch('/owner/properties');
      setProperties(data.data || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load your listings.');
      setMessageTone('error');
    } finally {
      setPropertiesLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: { pathname: '/my-listings' } } });
      return;
    }
    if (user.role !== 'user') {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadProperties();
  }, [loadProperties, loading, navigate, user]);

  useEffect(() => {
    apiRequest('/amenities')
      .then((data) => setAmenities(data.data || []))
      .catch(() => setAmenities([]));
  }, []);

  const openCreateForm = () => {
    setFormMode('create');
    setEditingProperty(null);
    setFieldErrors({});
    setFormMessage('');
  };

  const openEditForm = (property) => {
    setFormMode('edit');
    setEditingProperty(property);
    setFieldErrors({});
    setFormMessage('');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingProperty(null);
    setFieldErrors({});
    setFormMessage('');
  };

  const submitProperty = async (values) => {
    setFormBusy(true);
    setFieldErrors({});
    setFormMessage('');

    try {
      const formData = new FormData();
      const appendValue = (key, value) => {
        if (value === '' || value === null || value === undefined) return;
        formData.append(key, String(value));
      };

      appendValue('title', values.title.trim());
      appendValue('description', values.description.trim());
      appendValue('property_type', values.property_type);
      appendValue('listing_purpose', values.listing_purpose);
      appendValue('price', values.price === '' ? null : Number(values.price));
      appendValue('bedrooms', values.bedrooms === '' ? null : Number(values.bedrooms));
      appendValue('bathrooms', values.bathrooms === '' ? null : Number(values.bathrooms));
      appendValue('parking_spaces', values.parking_spaces === '' ? null : Number(values.parking_spaces));
      appendValue('area_sqm', values.area_sqm === '' ? null : Number(values.area_sqm));
      appendValue('address_line', values.address_line.trim());
      appendValue('city', values.city.trim());
      appendValue('province', values.province.trim());
      appendValue('status', values.status || 'Pending Review');
      appendValue('status_reason', values.status_reason || null);
      appendValue('owner_proof_type', values.owner_proof_type);
      appendValue('legal_accuracy_certified', values.legal_accuracy_certified ? '1' : null);
      appendValue('legal_no_duplicate', values.legal_no_duplicate ? '1' : null);
      appendValue('legal_data_privacy_consent', values.legal_data_privacy_consent ? '1' : null);

      if (values.amenity_ids.length > 0) {
        values.amenity_ids.forEach((amenityId) => formData.append('amenity_ids[]', String(Number(amenityId))));
      } else {
        formData.append('amenity_ids', '');
      }

      if (values.featured_image_file) {
        formData.append('featured_image_upload', values.featured_image_file);
      }

      if (values.owner_proof_file) {
        formData.append('owner_proof_upload', values.owner_proof_file);
      }

      if (formMode === 'edit') {
        formData.append('_method', 'PUT');
      }

      const response = await authFetch(
        formMode === 'edit' ? `/owner/properties/${editingProperty.property_id}` : '/owner/properties',
        { method: 'POST', body: formData },
      );

      await loadProperties();
      setMessage(response.message);
      setMessageTone('success');
      closeForm();
    } catch (error) {
      if (error.details) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages]),
        ));
        setFormMessage('Review the highlighted fields and submit again.');
        setFormMessageTone('error');
      } else {
        setFormMessage(error.message || 'Unable to save listing.');
        setFormMessageTone('error');
      }
    } finally {
      setFormBusy(false);
    }
  };

  const deleteProperty = (property) => {
    setConfirmState({
      title: 'Delete Owner Listing',
      message: `Delete "${property.title}" from your owner listings? This action cannot be undone.`,
      tone: 'danger',
      confirmText: 'Delete Listing',
      onConfirm: async () => {
        try {
          const response = await authFetch(`/owner/properties/${property.property_id}`, { method: 'DELETE' });
          await loadProperties();
          setMessage(response.message);
          setMessageTone('success');
          if (editingProperty?.property_id === property.property_id) closeForm();
        } catch (error) {
          setMessage(error.message || 'Unable to delete listing.');
          setMessageTone('error');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  if (loading || !user) {
    return <p className="empty-copy">Loading your owner listings...</p>;
  }

  return (
    <div className="page-shell dashboard-grid animate-enter">
      <section className="section-panel dashboard-hero animate-delay-1">
        <p className="eyebrow">Owner Listings</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--brand-base)', marginBottom: '0.5rem' }}>
          My Listings
        </h2>
        <p style={{ fontWeight: 300 }}>
          Submit owner-posted properties for review, then manage buyer inquiries and viewing requests here.
        </p>
        <InlineMessage message={message} tone={messageTone} onDismiss={() => setMessage('')} />
      </section>

      <ViewingRequestManager
        authFetch={authFetch}
        endpoint="/owner/viewing-requests"
        updateBasePath="/owner/viewing-requests"
        ownerMode
      />

      <InquiryManager
        authFetch={authFetch}
        endpoint="/owner/inquiries"
        updateBasePath="/owner/inquiries"
        ownerMode
      />

      <section className="section-panel agent-manager-panel animate-enter">
        <div className="agent-manager-header">
          <div>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Home size={14} aria-hidden="true" /> My Listings</p>
            <h2>Owner Listing Workspace</h2>
            <p className="agent-manager-copy">
              Draft a property, submit it for administrator review, and keep approved listings accurate.
            </p>
          </div>
          <button className="primary-button" onClick={openCreateForm} type="button">
            <Plus size={16} aria-hidden="true" />
            Add Listing
          </button>
        </div>

        {formMode ? (
          <AgentPropertyForm
            key={`${formMode}-${editingProperty?.property_id || 'new'}`}
            amenities={amenities}
            busy={formBusy}
            fieldErrors={fieldErrors}
            formMessage={formMessage}
            formMessageTone={formMessageTone}
            initialProperty={editingProperty}
            mode={formMode}
            onCancel={closeForm}
            onMessageDismiss={() => setFormMessage('')}
            onSubmit={submitProperty}
            ownerMode
            authFetch={authFetch}
            currentUser={user}
          />
        ) : null}

        {propertiesLoading && properties.length === 0 ? (
          <div className="agent-listings-grid">
            {[1, 2, 3].map((entry) => <div className="agent-listing-card agent-listing-card-skeleton" key={entry} />)}
          </div>
        ) : properties.length > 0 ? (
          <div className="agent-listings-grid">
            {properties.map((property) => (
              <article className="agent-listing-card" key={property.property_id}>
                <div
                  className="agent-listing-media"
                  style={property.featured_image ? { backgroundImage: `linear-gradient(rgba(6, 9, 14, 0.2), rgba(6, 9, 14, 0.75)), url(${property.featured_image})` } : undefined}
                >
                  <span className="property-type">{property.listing_purpose === 'rent' ? 'For Rent' : 'For Sale'} - {property.property_type}</span>
                  <span className={`property-status status-${property.status.toLowerCase().replace(/\s+/g, '-')}`}>{property.status}</span>
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
                    <strong className="property-price">{formatPrice(property)}</strong>
                  </div>
                  <p className="agent-listing-copy">{property.description}</p>
                  <div className="agent-listing-meta">
                    <span><BedDouble size={15} aria-hidden="true" /> {property.bedrooms ?? 'N/A'} bed</span>
                    <span><Bath size={15} aria-hidden="true" /> {property.bathrooms ?? 'N/A'} bath</span>
                    <span><Layers3 size={15} aria-hidden="true" /> {property.parking_spaces ?? 'N/A'} parking</span>
                    <span><Square size={15} aria-hidden="true" /> {property.area_sqm ?? 'N/A'} sqm</span>
                  </div>
                  <div className="agent-listing-submeta">
                    <span title="Total page views"><Clock3 size={14} aria-hidden="true" /> {property.views_count || 0} Views</span>
                    <span><ImageIcon size={14} aria-hidden="true" /> {property.featured_image ? 'Image linked' : 'No image'}</span>
                    <span>Listed {formatListedAt(property.listed_at || property.created_at)}</span>
                  </div>
                  <div className="agent-listing-actions">
                    <button className="ghost-button" onClick={() => openEditForm(property)} type="button">
                      <Pencil size={15} aria-hidden="true" />
                      Edit
                    </button>
                    <button className="danger-button" onClick={() => deleteProperty(property)} type="button">
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
            No owner listings yet. Add your first property when you are ready to submit it for review.
          </p>
        )}
      </section>

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
