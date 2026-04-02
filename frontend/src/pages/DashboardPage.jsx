import { useEffect, useState } from 'react';
import MetricCard from '../components/MetricCard';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, CheckCircle, Clock, Building, UserCheck, Search, ShieldCheck, Mail, Save, Clock3, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { authFetch, loading, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    authFetch('/dashboard')
      .then(setDashboard)
      .catch((error) => setMessage(error.message));

    if (user.role === 'admin') {
      authFetch('/admin/overview')
        .then(setAdminOverview)
        .catch((error) => setMessage(error.message));
    }
  }, [authFetch, user]);

  const updateAdminRecord = async (path, body) => {
    const data = await authFetch(path, { method: 'PATCH', body });
    setMessage(data.message);
    if (user?.role === 'admin') {
      const [nextDashboard, nextOverview] = await Promise.all([
        authFetch('/dashboard'),
        authFetch('/admin/overview'),
      ]);
      setDashboard(nextDashboard);
      setAdminOverview(nextOverview);
    }
  };

  if (loading) {
    return <p className="empty-copy"><Clock3 size={24} className="notification-popup-icon" /> Authenticating your session...</p>;
  }

  if (!user) {
    return <p className="empty-copy"><AlertCircle size={24} className="notification-popup-icon" /> Secure authentication required to view this dashboard.</p>;
  }

  if (!dashboard) {
    return <p className="empty-copy"><Clock3 size={24} className="notification-popup-icon" /> Assembling secure dashboard data...</p>;
  }

  // Pre-map icons for common metric labels
  const metricIcons = {
    total_users: Users,
    total_agents: UserCheck,
    total_properties: Building,
    pending_agents: Clock,
    draft_properties: FileText,
    available_properties: CheckCircle,
    active_inquiries: Mail,
    saved_properties: Save,
    approved: CheckCircle,
  };

  const getMetricIcon = (label) => {
    return metricIcons[label.toLowerCase().replace(/ /g, '_')] || ShieldCheck;
  };

  const statsEntries = Object.entries(dashboard.stats || {});

  return (
    <div className="page-grid dashboard-grid">
      <section className="section-panel dashboard-hero">
        <p className="eyebrow">Personalized Dashboard</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--brand-base)', marginBottom: '0.5rem' }}>
          Welcome, {user.full_name}
        </h2>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 300 }}>
          <ShieldCheck size={18} color="var(--primary-base)" />
          Clearance Level: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</strong>
        </p>
        
        {message ? (
          <p className="inline-message" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
            {message}
          </p>
        ) : null}
        
        <div className="metrics-grid">
          {statsEntries.map(([label, value], index) => {
            const cleanLabel = label.replace(/_/g, ' ');
            const Icon = getMetricIcon(label);
            return (
              <MetricCard 
                key={label} 
                label={cleanLabel} 
                tone={index % 2 ? 'accent' : 'default'} 
                value={value}
                icon={Icon}
              />
            );
          })}
        </div>
      </section>

      {user.role === 'user' ? (
        <>
          <section className="section-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Save size={14} /> Curated Collection</p>
            <h2>Saved Properties</h2>
            <div className="list-stack">
              {(dashboard.saved_properties || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>You haven't saved any properties yet.</p>}
              {(dashboard.saved_properties || []).map((property) => (
                <div className="list-card" key={property.property_id}>
                  <strong>{property.title}</strong>
                  <span>{property.city}, {property.province}</span>
                </div>
              ))}
            </div>
          </section>
          
          <section className="section-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Mail size={14} /> Communications</p>
            <h2>Inquiry History</h2>
            <div className="list-stack">
              {(dashboard.recent_inquiries || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>No recent inquiries.</p>}
              {(dashboard.recent_inquiries || []).map((entry) => (
                 <div className="list-card" key={entry.inquiry_id}>
                  <strong>{entry.property?.title}</strong>
                  <span style={{ color: 'var(--brand-base)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontSize: '0.75rem' }}>{entry.status}</span>
                  <p style={{ margin: 0, fontWeight: 300, fontStyle: 'italic', color: 'var(--text-light)' }}>"{entry.message}"</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {user.role === 'agent' ? (
        <>
          <section className="section-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><UserCheck size={14} /> Agent Profile</p>
            <h2>{dashboard.profile?.agency_name || 'Independent Agent'}</h2>
            <p className="property-copy" style={{ fontSize: '1rem', fontStyle: 'italic' }}>{dashboard.profile?.bio || "No biography provided."}</p>
            <div className="flex-row" style={{ color: 'var(--text-muted)' }}>
               <span>Authorization Status:</span>
               <span style={{ 
                 color: dashboard.profile?.approval_status === 'approved' ? 'var(--status-success)' : 'var(--status-warning)',
                 textTransform: 'uppercase',
                 fontWeight: 500,
                 letterSpacing: '0.05em'
               }}>
                 {dashboard.profile?.approval_status || 'Pending'}
               </span>
            </div>
          </section>
          
          <section className="section-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Mail size={14} /> Pipeline</p>
            <h2>Client Inquiries</h2>
            <div className="list-stack">
              {(dashboard.recent_inquiries || []).length === 0 && <p className="empty-copy" style={{ padding: '2rem' }}>Your pipeline is currently clear.</p>}
              {(dashboard.recent_inquiries || []).map((entry) => (
                <div className="list-card" key={entry.inquiry_id}>
                  <strong>{entry.property?.title}</strong>
                  <span style={{ color: 'var(--primary-base)' }}>Client: {entry.buyer_name}</span>
                  <p style={{ marginTop: '0.75rem', fontWeight: 300 }}>"{entry.message}"</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {user.role === 'admin' && adminOverview ? (
        <>
          <section className="section-panel admin-panel">
            <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Users size={14} /> Directory</p>
                <h2 style={{ margin: 0 }}>System Users</h2>
              </div>
            </div>
            
            <div className="table-stack">
              {adminOverview.users.map((entry) => (
                <div className="table-row" key={entry.id}>
                  <div>
                    <strong>{entry.full_name}</strong>
                    <span>{entry.email}</span>
                  </div>
                  <div className="table-actions">
                    <select
                      defaultValue={entry.role}
                      onChange={(event) => updateAdminRecord(`/admin/users/${entry.id}`, {
                        is_active: entry.is_active,
                        role: event.target.value,
                      })}
                    >
                      <option value="user">User</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      className={entry.is_active ? "ghost-button" : "primary-button"} 
                      onClick={() => updateAdminRecord(`/admin/users/${entry.id}`, {
                        is_active: !entry.is_active,
                        role: entry.role,
                      })}
                    >
                      {entry.is_active ? 'Suspend Access' : 'Restore Access'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="section-panel admin-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><UserCheck size={14} /> Approvals</p>
            <h2>Agent Authorizations</h2>
            <div className="table-stack">
              {adminOverview.agents.length === 0 && <p className="empty-copy">No agents pending review.</p>}
              {adminOverview.agents.map((entry) => (
                <div className="table-row" key={entry.agent_id}>
                  <div>
                    <strong>{entry.full_name}</strong>
                    <span>{entry.agency_name}</span>
                  </div>
                  <div className="table-actions">
                    <select
                      defaultValue={entry.approval_status}
                      onChange={(event) => updateAdminRecord(`/admin/agents/${entry.agent_id}`, {
                        approval_status: event.target.value,
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
          </section>
          
          <section className="section-panel admin-panel">
            <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}><Building size={14} /> Inventory</p>
            <h2>Property Status Review</h2>
            <div className="table-stack">
              {adminOverview.properties.length === 0 && <p className="empty-copy">No properties needing review.</p>}
              {adminOverview.properties.map((entry) => (
                <div className="table-row" key={entry.property_id}>
                  <div>
                    <strong>{entry.title}</strong>
                    <span>{entry.city}, {entry.province}</span>
                  </div>
                  <div className="table-actions">
                    <select
                      defaultValue={entry.status}
                      onChange={(event) => updateAdminRecord(`/admin/properties/${entry.property_id}`, {
                        status: event.target.value,
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
          </section>
        </>
      ) : null}
    </div>
  );
}
