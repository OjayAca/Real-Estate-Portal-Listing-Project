import { UserCheck, CalendarDays, MessageSquare, Plus, Home, CheckCircle, AlertCircle, Building, MapPin, BedDouble, Bath, Layers3, Square, ImageIcon, Pencil, Trash2, Clock3 } from 'lucide-react';
import AgentPropertyForm from './AgentPropertyForm';

const WEEKDAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getApprovalCopy(status) {
  if (status === 'suspended') {
    return 'Your agent profile is currently suspended. Property management actions are disabled until an administrator restores approval.';
  }

  return 'Your agent profile is still pending review. Listings can be managed here as soon as an administrator approves your account.';
}

function formatPrice(price) {
  const numericValue = Number(price || 0);
  return `PHP ${numericValue.toLocaleString()}`;
}

function formatListingPrice(property) {
  const price = formatPrice(property.price);
  return property.listing_purpose === 'rent' ? `${price}/mo` : price;
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

export default function AgentDashboard({
  agentProfile,
  isApprovedAgent,
  agentMessage,
  openCreateForm,
  agentFormMode,
  editingProperty,
  amenities,
  agentFormBusy,
  agentFormErrors,
  agentFormMessage,
  closeAgentForm,
  handlePropertySubmit,
  agentPropertiesLoading,
  agentProperties,
  openEditForm,
  handleDeleteProperty,
}) {
  return (
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
                    <span className="property-type">{property.listing_purpose === 'rent' ? 'For Rent' : 'For Sale'} - {property.property_type}</span>
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
                      <strong className="property-price">{formatListingPrice(property)}</strong>
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
                        <span title="Total page views"><Clock3 size={14} aria-hidden="true" /> {property.views_count || 0} Views</span>
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
  );
}
