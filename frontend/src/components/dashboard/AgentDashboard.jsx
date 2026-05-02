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
  agentBookings,
  agentBookingsBusy,
  respondingBooking,
  setRespondingBooking,
  responseMessage,
  setResponseMessage,
  responseBusy,
  updateBookingStatus,
  agentInquiries,
  agentInquiriesBusy,
  respondingInquiry,
  setRespondingInquiry,
  handleInquiryResponse,
  agentAvailability,
  agentAvailabilityBusy,
  addAvailabilityRow,
  updateAvailabilityRow,
  removeAvailabilityRow,
  saveAvailability,
  agentScheduleSaving,
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

              {entry.agent_response && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600 }}>Your Message to Buyer:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{entry.agent_response}</p>
                </div>
              )}

              <div className="table-actions" style={{ marginTop: '1rem' }}>
                {respondingBooking === entry.booking_id ? (
                  <div style={{ width: '100%' }}>
                    <textarea
                      autoFocus
                      placeholder="Add a message for the buyer..."
                      rows={2}
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      style={{ marginBottom: '1rem' }}
                    />
                    <div className="flex-row" style={{ gap: '1rem' }}>
                      <button 
                        className="primary-button" 
                        disabled={responseBusy}
                        onClick={() => updateBookingStatus(entry.booking_id, entry.status, responseMessage)}
                      >
                        {responseBusy ? 'Saving...' : 'Save Message'}
                      </button>
                      <button className="ghost-button" onClick={() => {
                        setRespondingBooking(null);
                        setResponseMessage('');
                      }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-row" style={{ gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                    <select
                      aria-label={`Update booking status for ${entry.property?.title}`}
                      disabled={!isApprovedAgent || responseBusy}
                      value={entry.status}
                      onChange={(event) => updateBookingStatus(entry.booking_id, event.target.value)}
                      style={{ flex: 1, minWidth: '120px' }}
                    >
                      {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button 
                      className="ghost-button" 
                      onClick={() => {
                        setRespondingBooking(entry.booking_id);
                        setResponseMessage(entry.agent_response || '');
                      }}
                      disabled={!isApprovedAgent || responseBusy}
                    >
                      {entry.agent_response ? 'Edit Message' : 'Add Message'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-panel animate-enter">
        <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><MessageSquare size={14} aria-hidden="true" /> Lead Management</p>
        <h2>Property Inquiries</h2>
        <div className="list-stack">
          {agentInquiriesBusy ? <p className="empty-copy" style={{ padding: '2rem' }}>Loading lead inquiries...</p> : null}
          {!agentInquiriesBusy && agentInquiries.length === 0 ? <p className="empty-copy" style={{ padding: '2rem' }}>No inquiries received yet.</p> : null}
          {!agentInquiriesBusy && agentInquiries.map((entry) => (
            <div className="list-card" key={entry.inquiry_id}>
              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <strong>{entry.property?.title}</strong>
                <span className={`property-status status-${entry.status.toLowerCase()}`}>{entry.status}</span>
              </div>
              <div style={{ margin: '0.5rem 0' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{entry.buyer_name}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{entry.buyer_email} · {entry.buyer_phone || 'No phone'}</p>
              </div>
              <p style={{ margin: '1rem 0', padding: '1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', fontStyle: 'italic' }}>
                "{entry.message}"
              </p>

              {entry.response_message && (
                <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600 }}>Your Response:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{entry.response_message}</p>
                </div>
              )}

              {entry.buyer_reply && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-base)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-base)' }}>Buyer Follow-up:</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{entry.buyer_reply}</p>
                  <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {entry.buyer_replied_at ? new Date(entry.buyer_replied_at).toLocaleString() : ''}
                  </span>
                </div>
              )}

              {isApprovedAgent && (
                <div className="table-actions">
                  {respondingInquiry === entry.inquiry_id ? (
                    <div style={{ width: '100%' }}>
                      <textarea
                        autoFocus
                        placeholder="Type your response to the buyer..."
                        rows={3}
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        style={{ marginBottom: '1rem' }}
                      />
                      <div className="flex-row" style={{ gap: '1rem' }}>
                        <button 
                          className="primary-button" 
                          disabled={responseBusy || !responseMessage.trim()}
                          onClick={() => handleInquiryResponse(entry.inquiry_id)}
                        >
                          {responseBusy ? 'Sending...' : 'Send Response'}
                        </button>
                        <button className="ghost-button" onClick={() => setRespondingInquiry(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="ghost-button" onClick={() => {
                      setRespondingInquiry(entry.inquiry_id);
                      setResponseMessage(entry.response_message || '');
                    }}>
                      {entry.response_message ? 'Edit Response' : 'Respond to Lead'}
                    </button>
                  )}
                </div>
              )}
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
