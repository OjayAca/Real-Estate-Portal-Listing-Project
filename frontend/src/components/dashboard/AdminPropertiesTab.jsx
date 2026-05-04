import { Building, Clock3, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

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
            </div>
            <div className="table-actions">
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
