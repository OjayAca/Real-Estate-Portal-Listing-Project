import { useEffect, useState, useCallback, useDeferredValue } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import InlineMessage from '../components/InlineMessage';
import MetricCard from '../components/MetricCard';
import DashboardLoading from '../components/dashboard/DashboardLoading';
import AgentDashboard from '../components/dashboard/AgentDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import {
  ShieldCheck,
  Users,
  UserCheck,
  Building,
  CheckCircle,
  Save,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';

const WEEKDAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function createFallbackDashboard(agentProfile) {
  return {
    role: 'agent',
    stats: {
      properties: 0,
      active_listings: 0,
    },
    profile: agentProfile,
    properties: [],
    assigned_seller_leads: [],
  };
}

export default function DashboardPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [confirmState, setConfirmState] = useState(null);
  const [amenities, setAmenities] = useState([]);

  // Agent States
  const [agentProperties, setAgentProperties] = useState([]);
  const [agentPropertiesLoading, setAgentPropertiesLoading] = useState(false);
  const [agentFormMode, setAgentFormMode] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [agentFormBusy, setAgentFormBusy] = useState(false);
  const [agentFormMessage, setAgentFormMessage] = useState('');
  const [agentFormMessageTone, setAgentFormMessageTone] = useState('info');
  const [agentFormErrors, setAgentFormErrors] = useState({});
  const [agentMessage, setAgentMessage] = useState('');
  const [agentMessageTone, setAgentMessageTone] = useState('info');

  // Admin Search States
  const [userSearch, setUserSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [adminPages, setAdminPages] = useState({ users: 1, agents: 1, properties: 1, seller_leads: 1 });

  const deferredUserSearch = useDeferredValue(userSearch);
  const deferredAgentSearch = useDeferredValue(agentSearch);
  const deferredPropertySearch = useDeferredValue(propertySearch);

  const loadAdminOverview = useCallback(async (uSearch = '', aSearch = '', pSearch = '', pages = { users: 1, agents: 1, properties: 1, seller_leads: 1 }) => {
    try {
      const params = new URLSearchParams();
      if (uSearch) params.append('user_search', uSearch);
      if (aSearch) params.append('agent_search', aSearch);
      if (pSearch) params.append('property_search', pSearch);
      params.append('users_page', String(pages.users));
      params.append('agents_page', String(pages.agents));
      params.append('properties_page', String(pages.properties));
      params.append('seller_leads_page', String(pages.seller_leads));

      const overview = await authFetch(`/admin/overview?${params.toString()}`);
      setAdminOverview(overview);
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
    }
  }, [authFetch]);

  const handleAdminPageChange = (type, page) => {
    setAdminPages(prev => ({ ...prev, [type]: page }));
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminOverview(deferredUserSearch, deferredAgentSearch, deferredPropertySearch, adminPages);
    }
  }, [deferredUserSearch, deferredAgentSearch, deferredPropertySearch, adminPages, user?.role, loadAdminOverview]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let ignore = false;
    const loadDashboard = async () => {
      if (!ignore) setLoading(true);
      try {
        const dashboardData = await authFetch('/dashboard');
        if (ignore) return;

        setDashboard(dashboardData);

        if (user.role === 'agent') {
          setAgentProperties(dashboardData.properties || []);
        }
      } catch (error) {
        if (ignore) return;

        if (user.role === 'agent' && error.status === 403) {
          setDashboard(createFallbackDashboard(user.agent_profile));
          setAgentProperties([]);
        } else {
          setMessage(error.message);
          setMessageTone('error');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [authFetch, user]);

  useEffect(() => {
    if (user?.role !== 'agent') return;

    let ignore = false;
    apiRequest('/amenities')
      .then((data) => {
        if (!ignore) setAmenities(data.data || []);
      })
      .catch(() => {
        if (!ignore) setAmenities([]);
      });

    return () => {
      ignore = true;
    };
  }, [user?.role]);

  const agentProfile = dashboard?.profile || user?.agent_profile || null;
  const isApprovedAgent = user?.role === 'agent' &&
    agentProfile?.approval_status === 'approved';

  useEffect(() => {
    if (!isApprovedAgent) {
      setAgentProperties([]);
      return;
    }

    let ignore = false;
    setAgentPropertiesLoading(true);

    authFetch('/agent/properties')
      .then((data) => {
        if (!ignore) setAgentProperties(data.data || []);
      })
      .catch((error) => {
        if (!ignore) {
          setAgentMessage(error.message);
          setAgentMessageTone('error');
        }
      })
      .finally(() => {
        if (!ignore) setAgentPropertiesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, isApprovedAgent]);

  const updateAdminRecord = async (path, body, reason = null, method = 'PATCH') => {
    const finalBody = { ...body };
    if (reason) {
      finalBody.status_reason = reason;
    }
    const data = await authFetch(path, { method, body: finalBody });
    setMessage(data.message);
    setMessageTone('success');
    if (user?.role === 'admin') {
      const [nextDashboard] = await Promise.all([
        authFetch('/dashboard'),
        loadAdminOverview(deferredUserSearch, deferredAgentSearch, deferredPropertySearch, adminPages),
      ]);
      setDashboard(nextDashboard);
    }
  };

  const openAdminConfirm = ({
    body,
    message: confirmMessage,
    path,
    title,
    tone = 'warning',
    showInput = false,
    inputPlaceholder,
    inputLabel,
    confirmText,
    method = 'PATCH',
    requiredInputValue,
  }) => {
    setConfirmState({
      title,
      message: confirmMessage,
      tone,
      showInput,
      inputPlaceholder,
      inputLabel,
      confirmText,
      requiredInputValue,
      onConfirm: async (reason) => {
        try {
          const requestBody = requiredInputValue ? { ...body, confirmation: reason } : body;
          await updateAdminRecord(path, requestBody, requiredInputValue ? null : reason, method);
        } catch (error) {
          setMessage(error.message);
          setMessageTone('error');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const refreshAgentWorkspace = async () => {
    const nextDashboard = await authFetch('/dashboard');
    setDashboard(nextDashboard);

    if (nextDashboard.profile?.approval_status === 'approved') {
      const nextProperties = await authFetch('/agent/properties');
      setAgentProperties(nextProperties.data || []);
      return;
    }

    setAgentProperties([]);
  };

  const openCreateForm = () => {
    setAgentFormMode('create');
    setEditingProperty(null);
    setAgentFormErrors({});
    setAgentFormMessage('');
    setAgentFormMessageTone('info');
  };

  const openEditForm = (property) => {
    setAgentFormMode('edit');
    setEditingProperty(property);
    setAgentFormErrors({});
    setAgentFormMessage('');
    setAgentFormMessageTone('info');
  };

  const closeAgentForm = () => {
    setAgentFormMode(null);
    setEditingProperty(null);
    setAgentFormErrors({});
    setAgentFormMessage('');
    setAgentFormMessageTone('info');
  };

  const handlePropertySubmit = async (values) => {
    setAgentFormBusy(true);
    setAgentFormErrors({});
    setAgentFormMessage('');
    setAgentFormMessageTone('info');
    setAgentMessage('');

    try {
      const formData = new FormData();
      const appendValue = (key, value) => {
        if (value === '' || value === null || value === undefined) return;
        formData.append(key, String(value));
      };

      appendValue('title', values.title.trim());
      appendValue('description', values.description.trim());
      appendValue('property_type', values.property_type);
      appendValue('listing_purpose', values.listing_purpose);
      appendValue('price', values.price === '' ? null : Number(values.price));
      appendValue('bedrooms', values.bedrooms === '' ? null : Number(values.bedrooms));
      appendValue('bathrooms', values.bathrooms === '' ? null : Number(values.bathrooms));
      appendValue('parking_spaces', values.parking_spaces === '' ? null : Number(values.parking_spaces));
      appendValue('area_sqm', values.area_sqm === '' ? null : Number(values.area_sqm));
      appendValue('address_line', values.address_line.trim());
      appendValue('city', values.city.trim());
      appendValue('province', values.province.trim());
      appendValue('status', values.status || null);
      appendValue('status_reason', values.status_reason || null);

      if (values.amenity_ids.length > 0) {
        values.amenity_ids.forEach((amenityId) => {
          formData.append('amenity_ids[]', String(Number(amenityId)));
        });
      } else {
        // Signal that the amenities list was explicitly cleared
        formData.append('amenity_ids', '');
      }

      if (values.featured_image_file) {
        formData.append('featured_image_upload', values.featured_image_file);
      }

      if (agentFormMode === 'edit') {
        formData.append('_method', 'PUT');
      }

      const response = await authFetch(
        agentFormMode === 'edit' ? `/agent/properties/${editingProperty.property_id}` : '/agent/properties',
        {
          method: 'POST',
          body: formData,
        },
      );

      await refreshAgentWorkspace();
      setAgentMessage(response.message);
      setAgentMessageTone('success');
      closeAgentForm();
    } catch (error) {
      if (error.details) {
        setAgentFormErrors(Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])
        ));
        setAgentFormMessage('Review the highlighted fields and submit again.');
        setAgentFormMessageTone('error');
      } else {
        setAgentFormMessage(error.message);
        setAgentFormMessageTone('error');
      }
    } finally {
      setAgentFormBusy(false);
    }
  };

  const handleDeleteProperty = (property) => {
    setConfirmState({
      title: 'Delete Property Listing',
      message: `Delete "${property.title}" from your dashboard inventory? This action cannot be undone.`,
      tone: 'danger',
      confirmText: 'Delete Listing',
      onConfirm: async () => {
        try {
          const response = await authFetch(`/agent/properties/${property.property_id}`, { method: 'DELETE' });
          await refreshAgentWorkspace();
          if (editingProperty?.property_id === property.property_id) {
            closeAgentForm();
          }
          setAgentMessage(response.message);
          setAgentMessageTone('success');
        } catch (error) {
          setAgentMessage(error.message);
          setAgentMessageTone('error');
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  if (authLoading || loading) {
    return <DashboardLoading message={authLoading ? 'Authenticating your session...' : 'Assembling secure dashboard data...'} />;
  }

  if (!user) {
    return <p className="empty-copy"><AlertCircle size={24} className="notification-popup-icon" /> Secure authentication required to view this dashboard.</p>;
  }

  const metricIcons = {
    users: Users,
    agents: UserCheck,
    properties: Building,
    total_users: Users,
    total_agents: UserCheck,
    total_properties: Building,
    pending_agents: Clock,
    draft_properties: FileText,
    available_properties: CheckCircle,
    active_listings: CheckCircle,
    seller_leads: FileText,
    new_seller_leads: Clock,
    saved_properties: Save,
    approved: CheckCircle,
  };

  const getMetricIcon = (label) => {
    return metricIcons[label.toLowerCase().replace(/ /g, '_')] || ShieldCheck;
  };

  const statsEntries = Object.entries(dashboard?.stats || {});

  return (
    <div className="page-shell page-grid dashboard-grid animate-enter">
      <section className="section-panel dashboard-hero animate-delay-1">
        <p className="eyebrow">Personalized Dashboard</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--brand-base)', marginBottom: '0.5rem' }}>
          Welcome, {user.full_name}
        </h2>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 300 }}>
          <ShieldCheck size={18} color="var(--primary-base)" aria-hidden="true" />
          Clearance Level: <strong style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>{user.role}</strong>
        </p>

        <InlineMessage
          message={message}
          tone={messageTone}
          onDismiss={() => setMessage('')}
          style={{ marginTop: '1.5rem', marginBottom: 0 }}
        />

        {statsEntries.length > 0 && (
          <div className="metrics-grid">
            {statsEntries.map(([label, value], index) => {
              const cleanLabel = label.replace(/_/g, ' ');
              const Icon = getMetricIcon(label);
              return (
                <div key={label} className={`animate-enter animate-delay-${(index % 3) + 1}`}>
                  <MetricCard
                    label={cleanLabel}
                    tone={index % 2 ? 'accent' : 'default'}
                    value={value}
                    icon={Icon}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {user.role === 'agent' && (
        <AgentDashboard
          agentProfile={agentProfile}
          isApprovedAgent={isApprovedAgent}
          agentMessage={agentMessage}
          agentMessageTone={agentMessageTone}
          onAgentMessageDismiss={() => setAgentMessage('')}
          openCreateForm={openCreateForm}
          agentFormMode={agentFormMode}
          editingProperty={editingProperty}
          amenities={amenities}
          agentFormBusy={agentFormBusy}
          agentFormErrors={agentFormErrors}
          agentFormMessage={agentFormMessage}
          agentFormMessageTone={agentFormMessageTone}
          onAgentFormMessageDismiss={() => setAgentFormMessage('')}
          closeAgentForm={closeAgentForm}
          handlePropertySubmit={handlePropertySubmit}
          agentPropertiesLoading={agentPropertiesLoading}
          agentProperties={agentProperties}
          assignedSellerLeads={dashboard?.assigned_seller_leads || []}
          openEditForm={openEditForm}
          handleDeleteProperty={handleDeleteProperty}
          authFetch={authFetch}
        />
      )}

      {user.role === 'admin' && (
        <AdminDashboard
          adminOverview={adminOverview}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          agentSearch={agentSearch}
          setAgentSearch={setAgentSearch}
          propertySearch={propertySearch}
          setPropertySearch={setPropertySearch}
          openAdminConfirm={openAdminConfirm}
          onPageChange={handleAdminPageChange}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        tone={confirmState?.tone}
        showInput={confirmState?.showInput}
        inputPlaceholder={confirmState?.inputPlaceholder}
        inputLabel={confirmState?.inputLabel}
        confirmText={confirmState?.confirmText}
        requiredInputValue={confirmState?.requiredInputValue}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
