import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { apiRequest } from '../api/client';
import AgentPropertyForm from '../components/dashboard/AgentPropertyForm';
import InlineMessage from '../components/InlineMessage';
import { useAuth } from '../context/AuthContext';

export default function SellPage() {
  const { authFetch, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [amenities, setAmenities] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: { pathname: '/sell' } } });
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    apiRequest('/amenities')
      .then((data) => setAmenities(data.data || []))
      .catch(() => setAmenities([]));
  }, []);

  const submitOwnerListing = async (values) => {
    setBusy(true);
    setFieldErrors({});
    setMessage('');

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
      appendValue('status', values.status || 'Pending Review');

      if (values.amenity_ids.length > 0) {
        values.amenity_ids.forEach((amenityId) => formData.append('amenity_ids[]', String(Number(amenityId))));
      }

      if (values.featured_image_file) {
        formData.append('featured_image_upload', values.featured_image_file);
      }

      const response = await authFetch('/owner/properties', {
        method: 'POST',
        body: formData,
      });

      setSubmitted(true);
      setMessage(response.message);
      setMessageTone('success');
      navigate('/my-listings');
    } catch (error) {
      if (error.details) {
        setFieldErrors(Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages]),
        ));
      }
      setMessage(error.message || 'Unable to submit your owner listing right now.');
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || !user) {
    return <p className="empty-copy">Redirecting to sign in...</p>;
  }

  if (user.role !== 'user') {
    return (
      <div className="page-shell animate-enter">
        <section className="section-panel">
          <p className="eyebrow">Owner Listings</p>
          <h2>Client account required</h2>
          <p className="agent-manager-copy">Owner-posted listings are available from client accounts.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell animate-enter">
      <section className="section-panel dashboard-hero">
        <p className="eyebrow">Sell With EstateFlow</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--brand-base)', marginBottom: '0.5rem' }}>
          Submit your property for review
        </h2>
        <p style={{ fontWeight: 300 }}>
          Owner-posted listings are reviewed by an administrator before they appear publicly. Buyers will see your real owner contact details after approval.
        </p>
        <InlineMessage
          icon={submitted ? CheckCircle2 : Sparkles}
          message={message}
          tone={messageTone}
          onDismiss={() => setMessage('')}
        />
      </section>

      <section className="section-panel agent-manager-panel">
        <AgentPropertyForm
          amenities={amenities}
          busy={busy}
          defaultStatus="Pending Review"
          fieldErrors={fieldErrors}
          formMessage={messageTone === 'error' ? message : ''}
          formMessageTone={messageTone}
          initialProperty={null}
          mode="create"
          onCancel={() => navigate('/my-listings')}
          onMessageDismiss={() => setMessage('')}
          onSubmit={submitOwnerListing}
          ownerMode
        />
      </section>
    </div>
  );
}
