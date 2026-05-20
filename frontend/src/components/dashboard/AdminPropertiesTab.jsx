import { Building, Clock3, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { API_BASE_URL } from '../../api/client';

function formatVerificationStatus(value) {
  return value ? value.replace(/_/g, ' ') : 'not submitted';
}

function verificationItems(entry) {
  const verification = entry.verification || {};
  if (entry.contact_type === 'owner') {
    return [
      ['Owner proof', verification.owner_proof_status === 'verified' ? 'verified' : formatVerificationStatus(verification.owner_proof_status)],
      ['Mobile OTP', verification.phone_verified ? 'verified' : 'not verified'],
      ['Legal terms', verification.legal_accuracy_accepted && verification.legal_no_duplicate_accepted && verification.legal_data_privacy_accepted ? 'accepted' : 'incomplete'],
    ];
  }

  return [
    ['Authority to Sell', verification.authority_to_sell_confirmed ? 'confirmed' : 'missing'],
    ['PRC license', verification.prc_verification_status === 'verified' ? 'verified' : formatVerificationStatus(verification.prc_verification_status)],
    ['Legal terms', verification.legal_accuracy_accepted && verification.legal_no_duplicate_accepted && verification.legal_data_privacy_accepted ? 'accepted' : 'incomplete'],
  ];
}

export default function AdminPropertiesTab({ adminOverview, propertySearch, setPropertySearch, openAdminConfirm, onPageChange }) {
  if (!adminOverview) return null;
  const propertiesData = Array.isArray(adminOverview.properties?.data) ? adminOverview.properties.data : [];
  const propertiesMeta = adminOverview.properties?.meta || { current_page: 1, last_page: 1 };

  return (
    <section className="section-panel admin-panel animate-enter">
      <div className="panel-header">
        <div className="panel-header-copy">
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <Building size={14} aria-hidden="true" /> Inventory
          </p>
          <h2>Property Status Review</h2>
        </div>
        <div className="panel-header-search">
          <input
            aria-label="Search properties by title or location"
            placeholder="Search properties by title or location..."
            type="text"
            value={propertySearch}
            onChange={(event) => setPropertySearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-stack">
        {propertiesData.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">
              <SearchX size={22} aria-hidden="true" />
            </span>
            <h3 className="empty-state-title">No properties found</h3>
            <p className="empty-state-copy">No properties match your search or are needing review right now.</p>
          </div>
        )}
        {propertiesData.map((entry) => (
          <div className="table-row" key={entry.property_id}>
            <div>
              <strong>{entry.title}</strong>
              <div className="flex-row" style={{ gap: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>{entry.city}, {entry.province}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={12} /> {entry.views_count || 0} views
                </span>
              </div>
              <div className="verification-review-list">
                {verificationItems(entry).map(([label, value]) => (
                  <span key={label}>{label}: <strong>{value}</strong></span>
                ))}
              </div>
              {entry.verification?.approval_blockers?.length ? (
                <p className="field-error">{entry.verification.approval_blockers.join(' ')}</p>
              ) : null}
            </div>
            <div className="table-actions">
              {entry.contact_type === 'owner' && entry.verification?.owner_proof_uploaded ? (
                <a
                  className="ghost-button"
                  href={`${API_BASE_URL}/admin/properties/${entry.property_id}/verification/owner-proof`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Proof
                </a>
              ) : null}
              {entry.contact_type === 'owner' ? (
                <select
                  value={entry.verification?.owner_proof_status || 'pending'}
                  aria-label={`Update owner proof verification for ${entry.title}`}
                  onChange={(event) => {
                    openAdminConfirm({
                      title: 'Update Owner Proof',
                      message: `Mark ownership proof for "${entry.title}" as ${event.target.value}?`,
                      path: `/admin/properties/${entry.property_id}/verification`,
                      body: { owner_proof_status: event.target.value },
                      tone: 'warning',
                    });
                  }}
                >
                  <option value="pending">Proof Pending</option>
                  <option value="verified">Proof Verified</option>
                  <option value="rejected">Proof Rejected</option>
                </select>
              ) : (
                <select
                  value={entry.verification?.prc_verification_status || 'pending'}
                  aria-label={`Update PRC verification for ${entry.title}`}
                  onChange={(event) => {
                    openAdminConfirm({
                      title: 'Update PRC Verification',
                      message: `Mark PRC license for "${entry.title}" as ${event.target.value}?`,
                      path: `/admin/properties/${entry.property_id}/verification`,
                      body: { prc_verification_status: event.target.value },
                      tone: 'warning',
                    });
                  }}
                >
                  <option value="pending">PRC Pending</option>
                  <option value="verified">PRC Verified</option>
                  <option value="rejected">PRC Rejected</option>
                </select>
              )}
              <select
                value={entry.status}
                aria-label={`Update status for ${entry.title}`}
                onChange={(event) => {
                  const newStatus = event.target.value;
                  const needsReason = ['Sold', 'Rented', 'Inactive'].includes(newStatus);
                  openAdminConfirm({
                    title: 'Update Property Status',
                    message: `Change the status of "${entry.title}" to ${newStatus}?`,
                    path: `/admin/properties/${entry.property_id}`,
                    body: { status: newStatus },
                    tone: 'warning',
                    showInput: needsReason,
                    inputLabel: 'Change Reason (Optional)',
                    inputPlaceholder: 'Explain the reason for this manual status update...'
                  });
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Available">Available</option>
                <option value="Sold">Sold</option>
                <option value="Rented">Rented</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending Sold">Pending Sold</option>
                <option value="Pending Rented">Pending Rented</option>
                <option value="Pending Review">Pending Review</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {propertiesMeta.last_page > 1 && (
        <div className="pager-row" style={{ marginTop: '2rem' }}>
          <button
            className="ghost-button"
            disabled={propertiesMeta.current_page === 1}
            onClick={() => onPageChange('properties', propertiesMeta.current_page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{propertiesMeta.current_page} / {propertiesMeta.last_page}</span>
          <button
            className="ghost-button"
            disabled={propertiesMeta.current_page === propertiesMeta.last_page}
            onClick={() => onPageChange('properties', propertiesMeta.current_page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
