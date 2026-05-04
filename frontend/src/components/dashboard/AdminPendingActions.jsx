import { Building, AlertCircle } from 'lucide-react';

export default function AdminPendingActions({ adminOverview, openAdminConfirm }) {
  if (!adminOverview) return null;
  const pendingApprovals = Number(adminOverview.stats?.pending_approvals || 0);
  const pendingAgents = Number(adminOverview.stats?.pending_agents || 0);
  if (!(pendingApprovals > 0 || pendingAgents > 0)) return null;

  return (
    <section
      className="section-panel admin-panel animate-enter"
      style={{ borderColor: 'var(--tone-warning-border)' }}
    >
      <div className="panel-header">
        <div className="panel-header-copy" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--tone-warning-bg)',
              color: 'var(--tone-warning-color)',
              border: '1px solid var(--tone-warning-border)',
            }}
          >
            <AlertCircle size={20} />
          </span>
          <div>
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
              <Building size={14} aria-hidden="true" /> Action Required
            </p>
            <h2>{pendingApprovals + pendingAgents} item{pendingApprovals + pendingAgents === 1 ? '' : 's'} need your review</h2>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {pendingApprovals} property status update{pendingApprovals === 1 ? '' : 's'} and {pendingAgents} agent application{pendingAgents === 1 ? '' : 's'} awaiting review.
            </p>
          </div>
        </div>
      </div>

      {adminOverview.pending_property_approvals?.length > 0 && (
        <div className="table-stack" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <p className="eyebrow">Pending Property Status Updates</p>
          {adminOverview.pending_property_approvals.map((property) => (
            <div
              className="table-row"
              key={`pending-${property.property_id}`}
            >
              <div style={{ flex: 1 }}>
                <div className="flex-row" style={{ gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1rem' }}>{property.title}</strong>
                  <span className="chip status-pending">{property.status}</span>
                </div>
                <span>
                  Requested by <strong style={{ display: 'inline', fontWeight: 600 }}>{property.agent?.full_name || 'Unknown Agent'}</strong>
                </span>
                {property.status_logs?.length > 0 && property.status_logs[0].reason && (
                  <p
                    style={{
                      margin: '0.6rem 0 0',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--tone-warning-bg)',
                      border: '1px solid var(--tone-warning-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                    }}
                  >
                    <strong>Reason:</strong> {property.status_logs[0].reason}
                  </p>
                )}
              </div>
              <div className="table-actions" style={{ gap: '0.5rem' }}>
                <button
                  className="primary-button"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
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
                  className="ghost-button danger-button"
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
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
  );
}
