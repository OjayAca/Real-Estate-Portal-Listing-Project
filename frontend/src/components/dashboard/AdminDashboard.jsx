import { Users, UserCheck, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminAnalytics from './AdminAnalytics';

export default function AdminDashboard({
  adminOverview,
  userSearch,
  setUserSearch,
  agentSearch,
  setAgentSearch,
  propertySearch,
  setPropertySearch,
  openAdminConfirm,
  onPageChange
}) {
  if (!adminOverview) return null;

  return (
    <>
      {adminOverview.analytics && <AdminAnalytics analytics={adminOverview.analytics} />}

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
          {adminOverview.users.data.length === 0 && <p className="empty-copy">No users match your search.</p>}
          {adminOverview.users.data.map((entry) => (
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

        {adminOverview.users.meta.last_page > 1 && (
          <div className="pager-row" style={{ marginTop: '2rem' }}>
            <button 
              className="ghost-button" 
              disabled={adminOverview.users.meta.current_page === 1}
              onClick={() => onPageChange('users', adminOverview.users.meta.current_page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{adminOverview.users.meta.current_page} / {adminOverview.users.meta.last_page}</span>
            <button 
              className="ghost-button" 
              disabled={adminOverview.users.meta.current_page === adminOverview.users.meta.last_page}
              onClick={() => onPageChange('users', adminOverview.users.meta.current_page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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
          {adminOverview.agents.data.length === 0 && <p className="empty-copy">No agents match your search or pending review.</p>}
          {adminOverview.agents.data.map((entry) => (
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

        {adminOverview.agents.meta.last_page > 1 && (
          <div className="pager-row" style={{ marginTop: '2rem' }}>
            <button 
              className="ghost-button" 
              disabled={adminOverview.agents.meta.current_page === 1}
              onClick={() => onPageChange('agents', adminOverview.agents.meta.current_page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{adminOverview.agents.meta.current_page} / {adminOverview.agents.meta.last_page}</span>
            <button 
              className="ghost-button" 
              disabled={adminOverview.agents.meta.current_page === adminOverview.agents.meta.last_page}
              onClick={() => onPageChange('agents', adminOverview.agents.meta.current_page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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
          {adminOverview.properties.data.length === 0 && <p className="empty-copy">No properties match your search or needing review.</p>}
          {adminOverview.properties.data.map((entry) => (
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

        {adminOverview.properties.meta.last_page > 1 && (
          <div className="pager-row" style={{ marginTop: '2rem' }}>
            <button 
              className="ghost-button" 
              disabled={adminOverview.properties.meta.current_page === 1}
              onClick={() => onPageChange('properties', adminOverview.properties.meta.current_page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{adminOverview.properties.meta.current_page} / {adminOverview.properties.meta.last_page}</span>
            <button 
              className="ghost-button" 
              disabled={adminOverview.properties.meta.current_page === adminOverview.properties.meta.last_page}
              onClick={() => onPageChange('properties', adminOverview.properties.meta.current_page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </>
  );
}
