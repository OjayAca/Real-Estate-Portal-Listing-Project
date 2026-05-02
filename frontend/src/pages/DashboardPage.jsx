import { useEffect, useState, useCallback, useDeferredValue } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import MetricCard from '../components/MetricCard';
import DashboardLoading from '../components/dashboard/DashboardLoading';
import AgentDashboard from '../components/dashboard/AgentDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import {
  ShieldCheck,
  Mail,
  Users,
  UserCheck,
  Building,
  Mail as MailIcon,
  CalendarDays,
  Bell,
  Clock,
  FileText,
  CheckCircle,
  Save,
  AlertCircle
} from 'lucide-react';

const WEEKDAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function createFallbackDashboard(agentProfile) {
  return {
    role: 'agent',
    stats: {
      properties: 0,
      active_listings: 0,
      new_inquiries: 0,
      closed_inquiries: 0,
      unread_notifications: 0,
    },
    profile: agentProfile,
    properties: [],
    recent_inquiries: [],
  };
}

export default function DashboardPage() {
  const { authFetch, loading: authLoading, user, sendVerification } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [amenities, setAmenities] = useState([]);

  // Agent States
  const [agentProperties, setAgentProperties] = useState([]);
  const [agentPropertiesLoading, setAgentPropertiesLoading] = useState(false);
  const [agentFormMode, setAgentFormMode] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [agentFormBusy, setAgentFormBusy] = useState(false);
  const [agentFormMessage, setAgentFormMessage] = useState('');
  const [agentFormErrors, setAgentFormErrors] = useState({});
  const [agentMessage, setAgentMessage] = useState('');
  const [agentAvailability, setAgentAvailability] = useState([]);
  const [agentAvailabilityBusy, setAgentAvailabilityBusy] = useState(false);
  const [agentScheduleSaving, setAgentScheduleSaving] = useState(false);
  const [agentBookings, setAgentBookings] = useState([]);
  const [agentBookingsBusy, setAgentBookingsBusy] = useState(false);
  const [agentInquiries, setAgentInquiries] = useState([]);
  const [agentInquiriesBusy, setAgentInquiriesBusy] = useState(false);

  // UI States
  const [respondingInquiry, setRespondingInquiry] = useState(null);
  const [respondingBooking, setRespondingBooking] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseBusy, setResponseBusy] = useState(false);

  // Admin Search States
  const [userSearch, setUserSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [adminPages, setAdminPages] = useState({ users: 1, agents: 1, properties: 1 });

  const deferredUserSearch = useDeferredValue(userSearch);
  const deferredAgentSearch = useDeferredValue(agentSearch);
  const deferredPropertySearch = useDeferredValue(propertySearch);

  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  const handleResendVerification = async () => {
    setVerificationBusy(true);
    setVerificationMessage('');
    try {
      const response = await sendVerification();
      setVerificationMessage(response.message || 'Verification link sent to your email.');
    } catch (error) {
      setVerificationMessage(error.message);
    } finally {
      setVerificationBusy(false);
    }
  };

  const loadAdminOverview = useCallback(async (uSearch = '', aSearch = '', pSearch = '', pages = { users: 1, agents: 1, properties: 1 }) => {
    try {
      const params = new URLSearchParams();
      if (uSearch) params.append('user_search', uSearch);
      if (aSearch) params.append('agent_search', aSearch);
      if (pSearch) params.append('property_search', pSearch);
      params.append('users_page', String(pages.users));
      params.append('agents_page', String(pages.agents));
      params.append('properties_page', String(pages.properties));

      const overview = await authFetch(`/admin/overview?${params.toString()}`);
      setAdminOverview(overview);
    } catch (error) {
      setMessage(error.message);
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
    agentProfile?.approval_status === 'approved' &&
    Boolean(user?.email_verified_at);

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
        if (!ignore) setAgentMessage(error.message);
      })
      .finally(() => {
        if (!ignore) setAgentPropertiesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, isApprovedAgent]);

  useEffect(() => {
    if (!isApprovedAgent) {
      setAgentAvailability([]);
      setAgentBookings([]);
      return;
    }

    let ignore = false;
    setAgentAvailabilityBusy(true);
    setAgentBookingsBusy(true);
    setAgentInquiriesBusy(true);

    authFetch('/agent/availability')
      .then((data) => {
        if (!ignore) setAgentAvailability(data.data || []);
      })
      .catch((error) => {
        if (!ignore) setAgentMessage(error.message);
      })
      .finally(() => {
        if (!ignore) setAgentAvailabilityBusy(false);
      });

    authFetch('/agent/viewings')
      .then((data) => {
        if (!ignore) setAgentBookings(data.data || []);
      })
      .catch((error) => {
        if (!ignore) setAgentMessage(error.message);
      })
      .finally(() => {
        if (!ignore) setAgentBookingsBusy(false);
      });

    authFetch('/agent/inquiries')
      .then((data) => {
        if (!ignore) setAgentInquiries(data.data || []);
      })
      .catch((error) => {
        if (!ignore) setAgentMessage(error.message);
      })
      .finally(() => {
        if (!ignore) setAgentInquiriesBusy(false);
      });

    return () => {
      ignore = true;
    };
  }, [authFetch, isApprovedAgent]);

  const handleInquiryResponse = async (inquiryId) => {
    if (!responseMessage.trim()) return;
    setResponseBusy(true);
    try {
      const response = await authFetch(`/agent/inquiries/${inquiryId}`, {
        method: 'PATCH',
        body: { status: 'Responded', response_message: responseMessage },
      });
      setAgentInquiries((current) => current.map((entry) => (
        entry.inquiry_id === inquiryId ? response.data : entry
      )));
      setRespondingInquiry(null);
      setResponseMessage('');
      setAgentMessage(response.message);
    } catch (error) {
      setAgentMessage(error.message);
    } finally {
      setResponseBusy(false);
    }
  };

  const updateAdminRecord = async (path, body) => {
    const data = await authFetch(path, { method: 'PATCH', body });
    setMessage(data.message);
    if (user?.role === 'admin') {
      const [nextDashboard] = await Promise.all([
        authFetch('/dashboard'),
        loadAdminOverview(deferredUserSearch, deferredAgentSearch, deferredPropertySearch, adminPages),
      ]);
      setDashboard(nextDashboard);
    }
  };

  const openAdminConfirm = ({ body, message: confirmMessage, path, title, tone = 'warning' }) => {
    setConfirmState({
      title,
      message: confirmMessage,
      tone,
      onConfirm: async () => {
        try {
          await updateAdminRecord(path, body);
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
  };

  const openEditForm = (property) => {
    setAgentFormMode('edit');
    setEditingProperty(property);
    setAgentFormErrors({});
    setAgentFormMessage('');
  };

  const closeAgentForm = () => {
    setAgentFormMode(null);
    setEditingProperty(null);
    setAgentFormErrors({});
    setAgentFormMessage('');
  };

  const handlePropertySubmit = async (values) => {
    setAgentFormBusy(true);
    setAgentFormErrors({});
    setAgentFormMessage('');
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
      closeAgentForm();
    } catch (error) {
      if (error.details) {
        setAgentFormErrors(Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])
        ));
        setAgentFormMessage('Review the highlighted fields and submit again.');
      } else {
        setAgentFormMessage(error.message);
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
        } catch (error) {
          setAgentMessage(error.message);
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  const addAvailabilityRow = () => {
    setAgentAvailability((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        day_of_week: 1,
        day_label: 'Monday',
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
      },
    ]);
  };

  const updateAvailabilityRow = (targetId, field, value) => {
    setAgentAvailability((current) => current.map((entry) => {
      if (entry.id !== targetId) return entry;
      return {
        ...entry,
        [field]: value,
        ...(field === 'day_of_week' ? { day_label: WEEKDAY_OPTIONS[Number(value)] } : {}),
      };
    }));
  };

  const removeAvailabilityRow = (targetId) => {
    setAgentAvailability((current) => current.filter((entry) => entry.id !== targetId));
  };

  const saveAvailability = async () => {
    setAgentScheduleSaving(true);
    try {
      const response = await authFetch('/agent/availability', {
        method: 'PUT',
        body: {
          availability: agentAvailability.map((entry) => ({
            day_of_week: Number(entry.day_of_week),
            start_time: entry.start_time,
            end_time: entry.end_time,
            is_active: entry.is_active,
          })),
        },
      });
      setAgentAvailability(response.data || []);
      setAgentMessage(response.message);
    } catch (error) {
      setAgentMessage(error.message);
    } finally {
      setAgentScheduleSaving(false);
    }
  };

  const updateBookingStatus = async (bookingId, status, responseMsg = null) => {
    setResponseBusy(true);
    try {
      const body = { status };
      if (responseMsg !== null) body.agent_response = responseMsg;

      const response = await authFetch(`/agent/viewings/${bookingId}`, {
        method: 'PATCH',
        body,
      });
      setAgentBookings((current) => current.map((entry) => (
        entry.booking_id === bookingId ? response.data : entry
      )));
      setAgentMessage(response.message);
      setRespondingBooking(null);
      setResponseMessage('');
    } catch (error) {
      setAgentMessage(error.message);
    } finally {
      setResponseBusy(false);
    }
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
    inquiries: MailIcon,
    bookings: CalendarDays,
    unread_notifications: Bell,
    total_users: Users,
    total_agents: UserCheck,
    total_properties: Building,
    pending_agents: Clock,
    draft_properties: FileText,
    available_properties: CheckCircle,
    active_inquiries: MailIcon,
    active_listings: CheckCircle,
    new_inquiries: MailIcon,
    closed_inquiries: ShieldCheck,
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

        {user.email_verified_at === null && user.role === 'agent' ? (
          <div className="inline-message animate-enter" style={{ marginTop: '2rem', marginBottom: '1rem', border: '1px solid var(--tone-warning-border)', background: 'var(--tone-warning-bg)' }}>
            <Mail size={24} style={{ color: 'var(--tone-warning-color)' }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Verify Your Email Address</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {verificationMessage || 'To protect your account and access all features, please verify your email. If you did not receive the link, we can send it again.'}
              </p>
            </div>
            <button
              className="primary-button"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem' }}
              disabled={verificationBusy}
              onClick={handleResendVerification}
            >
              {verificationBusy ? 'Sending...' : 'Resend Link'}
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="inline-message animate-enter" style={{ marginTop: '1.5rem', marginBottom: 0 }} role="status">
            {message}
          </p>
        ) : null}

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
          agentBookings={agentBookings}
          agentBookingsBusy={agentBookingsBusy}
          respondingBooking={respondingBooking}
          setRespondingBooking={setRespondingBooking}
          responseMessage={responseMessage}
          setResponseMessage={setResponseMessage}
          responseBusy={responseBusy}
          updateBookingStatus={updateBookingStatus}
          agentInquiries={agentInquiries}
          agentInquiriesBusy={agentInquiriesBusy}
          respondingInquiry={respondingInquiry}
          setRespondingInquiry={setRespondingInquiry}
          handleInquiryResponse={handleInquiryResponse}
          agentAvailability={agentAvailability}
          agentAvailabilityBusy={agentAvailabilityBusy}
          addAvailabilityRow={addAvailabilityRow}
          updateAvailabilityRow={updateAvailabilityRow}
          removeAvailabilityRow={removeAvailabilityRow}
          saveAvailability={saveAvailability}
          agentScheduleSaving={agentScheduleSaving}
          agentMessage={agentMessage}
          openCreateForm={openCreateForm}
          agentFormMode={agentFormMode}
          editingProperty={editingProperty}
          amenities={amenities}
          agentFormBusy={agentFormBusy}
          agentFormErrors={agentFormErrors}
          agentFormMessage={agentFormMessage}
          closeAgentForm={closeAgentForm}
          handlePropertySubmit={handlePropertySubmit}
          agentPropertiesLoading={agentPropertiesLoading}
          agentProperties={agentProperties}
          openEditForm={openEditForm}
          handleDeleteProperty={handleDeleteProperty}
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
        confirmText={confirmState?.confirmText}
        onConfirm={confirmState?.onConfirm || (() => setConfirmState(null))}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
