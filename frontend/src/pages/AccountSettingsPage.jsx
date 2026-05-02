import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Bell,
  Contact,
  Heart,
  LockKeyhole,
  Palette,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const unavailableGroups = [
  {
    title: 'Security Settings',
    icon: LockKeyhole,
    fields: ['Password change', 'Two-factor authentication'],
  },
  {
    title: 'Social Connections',
    icon: ShieldCheck,
    fields: ['Google sign-in', 'Facebook sign-in'],
  },
  {
    title: 'Search Preferences',
    icon: Search,
    fields: ['Saved search criteria', 'Advanced property filters'],
  },
  {
    title: 'Alert Preferences',
    icon: Bell,
    fields: ['Alert frequency', 'Delivery methods', 'Trigger alerts'],
  },
  {
    title: 'Communication',
    icon: Contact,
    fields: ['Preferred contact method', 'Assigned agent info', 'Language fluency'],
  },
];

function createForm(user) {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  };
}

export default function AccountSettingsPage() {
  const { authFetch, setUser, user } = useAuth();
  const { setTheme, theme } = useTheme();
  const [form, setForm] = useState(() => createForm(user));
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(createForm(user));
  }, [user]);

  const fullName = useMemo(() => [user?.first_name, user?.last_name].filter(Boolean).join(' '), [user]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});

    try {
      const response = await authFetch('/auth/profile', {
        method: 'PATCH',
        body: form,
      });
      setUser(response.user);
      setMessage(response.message || 'Profile updated.');
    } catch (error) {
      setErrors(error.details || {});
      setMessage(error.details ? 'Review the highlighted fields and submit again.' : error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell page-grid settings-page animate-enter">
      <section className="section-panel settings-hero">
        <div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem' }}>
            <UserRound size={14} aria-hidden="true" />
            Account Settings
          </p>
          <h2>{fullName || 'Your Account'}</h2>
          <p className="settings-muted">{user?.email}</p>
        </div>
        <span className="result-count">{user?.role}</span>
      </section>

      {message ? <p className="inline-message animate-enter">{message}</p> : null}

      <section className="section-panel settings-section">
        <div className="settings-section-heading">
          <UserRound size={20} className="notification-popup-icon" aria-hidden="true" />
          <div>
            <p className="eyebrow">Personal Information</p>
            <h3>Profile Details</h3>
          </div>
        </div>

        <form onSubmit={saveProfile}>
          <div className="field-grid two-up">
            <label>
              First Name
              <input name="first_name" value={form.first_name} onChange={updateField} />
              {errors.first_name ? <span className="field-error">{errors.first_name[0]}</span> : null}
            </label>
            <label>
              Last Name
              <input name="last_name" value={form.last_name} onChange={updateField} />
              {errors.last_name ? <span className="field-error">{errors.last_name[0]}</span> : null}
            </label>
          </div>

          <div className="field-grid two-up settings-field-row">
            <label>
              Contact Number
              <input name="phone" value={form.phone} onChange={updateField} placeholder="+1 234 567 890" />
              {errors.phone ? <span className="field-error">{errors.phone[0]}</span> : null}
            </label>
            <label>
              Email
              <input value={user?.email || ''} disabled readOnly />
            </label>
          </div>

          <div className="settings-actions">
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="section-panel settings-section">
        <div className="settings-section-heading">
          <Palette size={20} className="notification-popup-icon" aria-hidden="true" />
          <div>
            <p className="eyebrow">Display</p>
            <h3>Theme Preference</h3>
          </div>
        </div>
        <div className="field-grid two-up">
          <label>
            Theme
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <div className="settings-link-panel">
            <Heart size={18} aria-hidden="true" />
            <Link className="text-link" to="/saved-properties">Saved Listings</Link>
          </div>
        </div>
      </section>

      {unavailableGroups.map((group) => {
        const GroupIcon = group.icon;

        return (
          <section className="section-panel settings-section settings-section-disabled" key={group.title}>
            <div className="settings-section-heading">
              <GroupIcon size={20} className="notification-popup-icon" aria-hidden="true" />
              <div>
                <p className="eyebrow">Coming Soon</p>
                <h3>{group.title}</h3>
              </div>
            </div>
            <div className="settings-disabled-grid">
              {group.fields.map((field) => (
                <label className="settings-disabled-control" key={field}>
                  {field}
                  <input value="Coming soon" disabled readOnly />
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
