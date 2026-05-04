import { UserCheck, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

export default function AdminAgentsTab({ adminOverview, agentSearch, setAgentSearch, openAdminConfirm, onPageChange }) {
  if (!adminOverview) return null;
  const agentsData = Array.isArray(adminOverview.agents?.data) ? adminOverview.agents.data : [];
  const agentsMeta = adminOverview.agents?.meta || { current_page: 1, last_page: 1 };

  return (
    <section className="section-panel admin-panel animate-enter animate-delay-3">
      <div className="panel-header">
        <div className="panel-header-copy">
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <UserCheck size={14} aria-hidden="true" /> Approvals
          </p>
          <h2>Agent Authorizations</h2>
        </div>
        <div className="panel-header-search">
          <input
            aria-label="Search agents by name or agency"
            placeholder="Search agents by name or agency..."
            type="text"
            value={agentSearch}
            onChange={(event) => setAgentSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="table-stack">
        {agentsData.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">
              <SearchX size={22} aria-hidden="true" />
            </span>
            <h3 className="empty-state-title">No agents found</h3>
            <p className="empty-state-copy">No agents match your search or are pending review at the moment.</p>
          </div>
        )}
        {agentsData.map((entry) => (
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

      {agentsMeta.last_page > 1 && (
        <div className="pager-row" style={{ marginTop: '2rem' }}>
          <button
            className="ghost-button"
            disabled={agentsMeta.current_page === 1}
            onClick={() => onPageChange('agents', agentsMeta.current_page - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{agentsMeta.current_page} / {agentsMeta.last_page}</span>
          <button
            className="ghost-button"
            disabled={agentsMeta.current_page === agentsMeta.last_page}
            onClick={() => onPageChange('agents', agentsMeta.current_page + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
