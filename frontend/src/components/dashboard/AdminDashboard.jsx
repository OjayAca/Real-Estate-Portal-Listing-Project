import { useState } from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import DashboardTabs from './DashboardTabs';
import AdminAnalytics from './AdminAnalyticsTwoColumn';
import AdminPendingActions from './AdminPendingActions';
import AdminUsersTab from './AdminUsersTab';
import AdminLeadsTab from './AdminLeadsTab';
import AdminAgentsTab from './AdminAgentsTab';
import AdminPropertiesTab from './AdminPropertiesTab';
import './dashboard-tabs.css';

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
  const [activeTab, setActiveTab] = useState('overview');
  const analyticsWithStats = { ...(adminOverview.analytics || {}), stats: adminOverview.stats };

  const pendingApprovals = Number(adminOverview.stats?.pending_approvals || 0);
  const pendingAgents = Number(adminOverview.stats?.pending_agents || 0);
  const pendingTotal = pendingApprovals + pendingAgents;

  const counts = {
    pending: pendingTotal,
    users: adminOverview.users?.meta?.total,
    leads: adminOverview.seller_leads?.meta?.total,
    agents: adminOverview.agents?.meta?.total,
    properties: adminOverview.properties?.meta?.total,
  };

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <ShieldCheck size={14} aria-hidden="true" /> Admin Console
          </p>
          <h1>Dashboard Overview</h1>
          <p>Manage users, agents, properties, and seller leads from a single place.</p>
        </div>
        {pendingTotal > 0 && (
          <span className="dashboard-header-meta" role="status">
            {pendingTotal} item{pendingTotal === 1 ? '' : 's'} awaiting review
          </span>
        )}
      </header>

      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-overview`}
        aria-labelledby={`dashboard-tab-overview`}
        hidden={activeTab !== 'overview'}
      >
        {adminOverview.analytics && <AdminAnalytics analytics={analyticsWithStats} />}
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-pending`}
        aria-labelledby={`dashboard-tab-pending`}
        hidden={activeTab !== 'pending'}
      >
        {pendingTotal > 0 ? (
          <AdminPendingActions adminOverview={adminOverview} openAdminConfirm={openAdminConfirm} />
        ) : (
          <div className="empty-state empty-state-success" role="status">
            <span className="empty-state-icon">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <h3 className="empty-state-title">All caught up</h3>
            <p className="empty-state-copy">
              No agent applications or property status changes are waiting on you right now.
            </p>
          </div>
        )}
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-users`}
        aria-labelledby={`dashboard-tab-users`}
        hidden={activeTab !== 'users'}
      >
        <AdminUsersTab
          adminOverview={adminOverview}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          openAdminConfirm={openAdminConfirm}
          onPageChange={onPageChange}
        />
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-leads`}
        aria-labelledby={`dashboard-tab-leads`}
        hidden={activeTab !== 'leads'}
      >
        <AdminLeadsTab adminOverview={adminOverview} onPageChange={onPageChange} openAdminConfirm={openAdminConfirm} />
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-agents`}
        aria-labelledby={`dashboard-tab-agents`}
        hidden={activeTab !== 'agents'}
      >
        <AdminAgentsTab
          adminOverview={adminOverview}
          agentSearch={agentSearch}
          setAgentSearch={setAgentSearch}
          openAdminConfirm={openAdminConfirm}
          onPageChange={onPageChange}
        />
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`dashboard-panel-properties`}
        aria-labelledby={`dashboard-tab-properties`}
        hidden={activeTab !== 'properties'}
      >
        <AdminPropertiesTab
          adminOverview={adminOverview}
          propertySearch={propertySearch}
          setPropertySearch={setPropertySearch}
          openAdminConfirm={openAdminConfirm}
          onPageChange={onPageChange}
        />
      </div>
    </>
  );
}
