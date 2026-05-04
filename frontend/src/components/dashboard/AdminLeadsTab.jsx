import { ClipboardList, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

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

export default function AdminLeadsTab({ adminOverview, onPageChange, openAdminConfirm }) {
  if (!adminOverview) return null;
  const sellerLeads = Array.isArray(adminOverview.seller_leads?.data) ? adminOverview.seller_leads.data : [];
  const sellerLeadsMeta = adminOverview.seller_leads?.meta || { current_page: 1, last_page: 1 };
  const assignableAgents = Array.isArray(adminOverview.assignable_agents) ? adminOverview.assignable_agents : [];

  return (
    <section className="section-panel admin-panel animate-enter">
      <div className="panel-header">
        <div className="panel-header-copy">
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <ClipboardList size={14} aria-hidden="true" /> Seller Leads
          </p>
          <h2>Seller Lead Management</h2>
        </div>
      </div>

      {sellerLeads.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">
            <Inbox size={22} aria-hidden="true" />
          </span>
          <h3 className="empty-state-title">No seller leads yet</h3>
          <p className="empty-state-copy">Submitted seller leads will appear here so you can triage and assign them to agents.</p>
        </div>
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
              {sellerLeads.map((lead) => (
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
                        const selectedAgent = assignableAgents.find((agent) => agent.agent_id === selectedAgentId);
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
                      {assignableAgents.map((agent) => (
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

      {sellerLeadsMeta.last_page > 1 && (
        <div className="pager-row" style={{ marginTop: '2rem' }}>
          <button
            className="ghost-button"
            disabled={sellerLeadsMeta.current_page === 1}
            onClick={() => onPageChange('seller_leads', sellerLeadsMeta.current_page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{sellerLeadsMeta.current_page} / {sellerLeadsMeta.last_page}</span>
          <button
            className="ghost-button"
            disabled={sellerLeadsMeta.current_page === sellerLeadsMeta.last_page}
            onClick={() => onPageChange('seller_leads', sellerLeadsMeta.current_page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
