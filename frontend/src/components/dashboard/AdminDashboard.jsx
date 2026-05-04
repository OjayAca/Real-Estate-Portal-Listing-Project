import { Users, UserCheck, Building, ChevronLeft, ChevronRight, Clock3, ClipboardList, Trash2 } from 'lucide-react';
import AdminAnalytics from './AdminAnalytics';

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return 'Not provided';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) return 'Not recorded';

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

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
  const analyticsWithStats = { ...adminOverview.analytics, stats: adminOverview.stats };

  return (
    <>
      {adminOverview.analytics && <AdminAnalytics analytics={analyticsWithStats} />}

      {(adminOverview.stats.pending_approvals > 0 || adminOverview.stats.pending_agents > 0) && (
        <section className="section-panel admin-panel animate-enter" style={{ border: '2px solid var(--accent-base)', background: 'var(--accent-light)05' }}>
          <div className="flex-row" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ background: 'var(--accent-base)', color: 'white', padding: '8px', borderRadius: '8px' }}>
              <Building size={20} />
            </span>
            <div>
              <h2 style={{ margin: 0 }}>Action Required</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                You have {adminOverview.stats.pending_approvals} property status updates and {adminOverview.stats.pending_agents} agent applications awaiting review.
              </p>
            </div>
          </div>

          {adminOverview.pending_property_approvals?.length > 0 && (
            <div className="table-stack" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <p className="eyebrow">Pending Property Status Updates</p>
              {adminOverview.pending_property_approvals.map((property) => (
                <div className="table-row" key={`pending-${property.property_id}`} style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '12px', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div className="flex-row" style={{ gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{property.title}</strong>
                      <span className={`chip status-pending`}>{property.status}</span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Requested by <strong>{property.agent?.full_name || 'Unknown Agent'}</strong>
                    </p>
                    {property.status_logs?.length > 0 && property.status_logs[0].reason && (
                      <p style={{ margin: '8px 0', padding: '8px', background: 'var(--accent-light)08', borderRadius: '6px', fontSize: '0.85rem', borderLeft: '3px solid var(--accent-base)' }}>
                        <strong>Reason:</strong> {property.status_logs[0].reason}
                      </p>
                    )}
                  </div>
                  <div className="table-actions" style={{ gap: '0.5rem' }}>
                    <button
                      className="primary-button"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => openAdminConfirm({
                        title: 'Approve Status Change',
                        message: `Approve marking "${property.title}" as ${property.status.replace('Pending ', '')}?`,
                        path: `/admin/properties/${property.property_id}`,
                        body: { status: property.status.replace('Pending ', '') },
                        tone: 'success',
                        showInput: true,
                        inputLabel: 'Approval Note (Optional)',
                        inputPlaceholder: 'Add a note about this approval...'
                      })}
                    >
                      Approve
                    </button>
                    <button
                      className="ghost-button"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--status-danger)' }}
                      onClick={() => openAdminConfirm({
                        title: 'Reject Status Change',
                        message: `Reject status change for "${property.title}"? It will revert to "Available".`,
                        path: `/admin/properties/${property.property_id}`,
                        body: { status: 'Available' },
                        tone: 'danger',
                        showInput: true,
                        inputLabel: 'Rejection Reason',
                        inputPlaceholder: 'Explain why this status change was rejected...'
                      })}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
                <button
                  className="ghost-button danger-button"
                  aria-label={`Delete ${entry.full_name}`}
                  disabled={entry.role === 'admin'}
                  onClick={() => openAdminConfirm({
                    title: 'Permanently Delete User',
                    message: `This will permanently delete ${entry.full_name}'s account. This action cannot be undone.`,
                    path: `/admin/users/${entry.id}`,
                    body: {},
                    method: 'DELETE',
                    tone: 'danger',
                    confirmText: 'Delete User',
                    showInput: true,
                    inputLabel: 'Deletion Confirmation',
                    inputPlaceholder: `DELETE ${entry.email}`,
                    requiredInputValue: `DELETE ${entry.email}`,
                  })}
                  type="button"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete
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

      <section className="section-panel admin-panel animate-enter">
        <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><ClipboardList size={14} aria-hidden="true" /> Seller Leads</p>
            <h2 style={{ margin: 0 }}>Seller Lead Management</h2>
          </div>
        </div>

        {adminOverview.seller_leads.data.length === 0 ? (
          <p className="empty-copy">No seller leads have been submitted yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Submitter</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Condition</th>
                  <th>Expected Price</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Assigned Agent</th>
                </tr>
              </thead>
              <tbody>
                {adminOverview.seller_leads.data.map((lead) => (
                  <tr key={lead.seller_lead_id}>
                    <td>
                      <strong>{lead.full_name}</strong>
                      <span>{lead.email}</span>
                      <span>{lead.phone}</span>
                    </td>
                    <td>{lead.property_address}</td>
                    <td>{lead.property_type}</td>
                    <td>{lead.condition_of_home}</td>
                    <td>{formatMoney(lead.expected_price)}</td>
                    <td>{formatDate(lead.created_at)}</td>
                    <td>
                      <select
                        aria-label={`Update seller lead status for ${lead.full_name}`}
                        value={lead.status}
                        onChange={(event) => openAdminConfirm({
                          title: 'Update Seller Lead Status',
                          message: `Change ${lead.full_name}'s seller lead status to ${event.target.value}?`,
                          path: `/admin/seller-leads/${lead.seller_lead_id}`,
                          body: { status: event.target.value },
                          tone: 'warning',
                        })}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Converted">Converted</option>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`Assign seller lead from ${lead.full_name}`}
                        value={lead.assigned_agent_id || ''}
                        onChange={(event) => {
                          const selectedAgentId = event.target.value ? Number(event.target.value) : null;
                          const selectedAgent = adminOverview.assignable_agents.find((agent) => agent.agent_id === selectedAgentId);
                          openAdminConfirm({
                            title: 'Assign Seller Lead',
                            message: selectedAgent
                              ? `Assign ${lead.full_name}'s seller lead to ${selectedAgent.full_name}?`
                              : `Clear the agent assignment for ${lead.full_name}'s seller lead?`,
                            path: `/admin/seller-leads/${lead.seller_lead_id}`,
                            body: { assigned_agent_id: selectedAgentId },
                            tone: 'warning',
                          });
                        }}
                      >
                        <option value="">Unassigned</option>
                        {adminOverview.assignable_agents.map((agent) => (
                          <option key={agent.agent_id} value={agent.agent_id}>
                            {agent.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {adminOverview.seller_leads.meta.last_page > 1 && (
          <div className="pager-row" style={{ marginTop: '2rem' }}>
            <button
              className="ghost-button"
              disabled={adminOverview.seller_leads.meta.current_page === 1}
              onClick={() => onPageChange('seller_leads', adminOverview.seller_leads.meta.current_page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{adminOverview.seller_leads.meta.current_page} / {adminOverview.seller_leads.meta.last_page}</span>
            <button
              className="ghost-button"
              disabled={adminOverview.seller_leads.meta.current_page === adminOverview.seller_leads.meta.last_page}
              onClick={() => onPageChange('seller_leads', adminOverview.seller_leads.meta.current_page + 1)}
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
