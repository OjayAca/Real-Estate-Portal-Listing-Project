import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import InlineMessage from '../components/InlineMessage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Bell,
  Bookmark,
  Contact,
  Heart,
  LockKeyhole,
  Palette,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';

function createForm(user) {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    bio: user?.agent_profile?.bio || '',
  };
}

export default function AccountSettingsPage() {
  const { authFetch, setUser, user } = useAuth();
  const { setTheme, theme } = useTheme();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => createForm(user));
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [emailForm, setEmailForm] = useState({ email: user?.email || '' });
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [savedSearchesBusy, setSavedSearchesBusy] = useState(true);

  useEffect(() => {
    setForm(createForm(user));
    setEmailForm({ email: user?.email || '' });
  }, [user]);

  useEffect(() => {
    if (searchParams.get('verified')) {
      setMessage('Your email address has been successfully verified and updated.');
      setMessageTone('success');
    } else if (searchParams.get('error') === 'invalid_signature') {
      setMessage('The verification link is invalid or has expired.');
      setMessageTone('error');
    }
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    if (user?.role !== 'user') {
      setSavedSearchesBusy(false);
      return undefined;
    }

    setSavedSearchesBusy(true);
    authFetch('/saved-searches')
      .then((data) => {
        if (!ignore) setSavedSearches(data.data || []);
      })
      .catch(() => {
        if (!ignore) setSavedSearches([]);
      })
      .finally(() => {
        if (!ignore) setSavedSearchesBusy(false);
      });

    return () => { ignore = true; };
  }, [authFetch, user]);

  const fullName = useMemo(() => [user?.first_name, user?.last_name].filter(Boolean).join(' '), [user]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updatePasswordFields = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const updateEmailField = (event) => {
    const { name, value } = event.target;
    setEmailForm((current) => ({ ...current, [name]: value }));
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
      setMessageTone('success');
    } catch (error) {
      setErrors(error.details || {});
      setMessage(error.details ? 'Review the highlighted fields and submit again.' : error.message);
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});

    try {
      const response = await authFetch('/auth/password', {
        method: 'PATCH',
        body: passwordForm,
      });
      setMessage(response.message);
      setMessageTone('success');
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (error) {
      setErrors(error.details || {});
      setMessage(error.details ? 'Review the highlighted fields and submit again.' : error.message);
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  const updateEmail = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setErrors({});

    try {
      const response = await authFetch('/auth/email', {
        method: 'PATCH',
        body: emailForm,
      });
      setMessage(response.message);
      setMessageTone('success');
    } catch (error) {
      setErrors(error.details || {});
      setMessage(error.details ? 'Review the highlighted fields and submit again.' : error.message);
      setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  const toggleSearchAlert = async (search) => {
    try {
      const updated = await authFetch(`/saved-searches/${search.id}`, {
        method: 'PATCH',
        body: { notify_email: !search.notify_email },
      });
      setSavedSearches((current) =>
        current.map((entry) => (entry.id === search.id ? updated.data : entry)),
      );
      setMessage(`Email alerts ${updated.data.notify_email ? 'enabled' : 'disabled'} for "${updated.data.name}".`);
      setMessageTone('success');
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
    }
  };

  const deleteSearch = async (search) => {
    try {
      await authFetch(`/saved-searches/${search.id}`, { method: 'DELETE' });
      setSavedSearches((current) => current.filter((entry) => entry.id !== search.id));
      setMessage('Saved search removed.');
      setMessageTone('success');
    } catch (error) {
      setMessage(error.message);
      setMessageTone('error');
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

      <InlineMessage
        message={message}
        tone={messageTone}
        onDismiss={() => setMessage('')}
      />

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
            <label style={user?.role === 'agent' ? { opacity: 0.6 } : undefined}>
              Contact Number
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="+1 234 567 890"
                disabled={user?.role === 'agent'}
                readOnly={user?.role === 'agent'}
              />
              {errors.phone ? <span className="field-error">{errors.phone[0]}</span> : null}
            </label>
            <label style={{ opacity: 0.6 }}>
              Current Email
              <input value={user?.email || ''} disabled readOnly />
            </label>
          </div>

          {user?.role === 'agent' && user?.agent_profile && (
            <>
              <div className="field-grid two-up" style={{ marginTop: '1.5rem' }}>
                <label style={{ opacity: 0.6 }}>
                  Agency Name
                  <input value={user.agent_profile.agency?.name || user.agent_profile.agency_name || 'Independent'} disabled readOnly />
                </label>
                <label style={{ opacity: 0.6 }}>
                  License Number
                  <input value={user.agent_profile.license_number || ''} disabled readOnly />
                </label>
              </div>

              <div className="field-grid" style={{ marginTop: '1.5rem' }}>
                <label>
                  Professional Bio
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={updateField}
                    rows={5}
                    style={{ resize: 'none' }}
                    placeholder="Tell clients about your expertise and history..."
                  />
                  {errors.bio ? <span className="field-error">{errors.bio[0]}</span> : null}
                </label>
              </div>

              <p className="field-help" style={{ marginTop: '1rem' }}>
                Professional identity details (Agency & License) are verified by administrators. To request an update, please contact the support team.
              </p>
            </>
          )}

          <div className="settings-actions">
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="section-panel settings-section">
        <div className="settings-section-heading">
          <LockKeyhole size={20} className="notification-popup-icon" aria-hidden="true" />
          <div>
            <p className="eyebrow">Security</p>
            <h3>Change Password</h3>
          </div>
        </div>

        <form onSubmit={updatePassword}>
          <div className="field-grid three-up">
            <label>
              Current Password
              <input name="current_password" type="password" value={passwordForm.current_password} onChange={updatePasswordFields} required />
              {errors.current_password ? <span className="field-error">{errors.current_password[0]}</span> : null}
            </label>
            <label>
              New Password
              <input name="password" type="password" value={passwordForm.password} onChange={updatePasswordFields} required />
              {errors.password ? <span className="field-error">{errors.password[0]}</span> : null}
            </label>
            <label>
              Confirm Password
              <input name="password_confirmation" type="password" value={passwordForm.password_confirmation} onChange={updatePasswordFields} required />
            </label>
          </div>

          <div className="settings-actions">
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>

      <section className="section-panel settings-section">
        <div className="settings-section-heading">
          <Contact size={20} className="notification-popup-icon" aria-hidden="true" />
          <div>
            <p className="eyebrow">Account</p>
            <h3>Change Email Address</h3>
          </div>
        </div>

        <form onSubmit={updateEmail}>
          <div className="field-grid">
            <label>
              New Email Address
              <input name="email" type="email" value={emailForm.email} onChange={updateEmailField} required />
              {errors.email ? <span className="field-error">{errors.email[0]}</span> : null}
              <p className="field-help" style={{ marginTop: '0.4rem' }}>
                We will send a verification link to this address. The change will not take effect until the new address is verified.
              </p>
            </label>
          </div>

          <div className="settings-actions">
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Sending Request...' : 'Request Email Change'}
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

      {user?.role === 'user' && (
        <section className="section-panel settings-section">
          <div className="settings-section-heading">
            <Bookmark size={20} className="notification-popup-icon" aria-hidden="true" />
            <div>
              <p className="eyebrow">Search & Alerts</p>
              <h3>Saved Searches</h3>
            </div>
          </div>

          {savedSearchesBusy ? (
            <div className="settings-disabled-grid">
              <div className="listing-card-skeleton" style={{ height: '48px' }} />
            </div>
          ) : savedSearches.length > 0 ? (
            <div className="saved-searches-list">
              {savedSearches.map((search) => (
                <div className="saved-search-row" key={search.id}>
                  <div className="saved-search-info">
                    <strong>{search.name}</strong>
                    <span className="saved-search-meta">
                      {search.listing_purpose === 'rent' ? 'Rentals' : 'For Sale'}
                      {search.filters?.city ? ` · ${search.filters.city}` : ''}
                      {search.filters?.property_type ? ` · ${search.filters.property_type}` : ''}
                    </span>
                  </div>
                  <div className="saved-search-actions">
                    <label className="toggle-label">
                      <input
                        checked={search.notify_email}
                        onChange={() => toggleSearchAlert(search)}
                        type="checkbox"
                      />
                      <Bell size={14} aria-hidden="true" />
                      Email alerts
                    </label>
                    <button
                      className="ghost-button danger-button"
                      type="button"
                      onClick={() => deleteSearch(search)}
                      aria-label={`Delete ${search.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-copy" style={{ padding: '2rem' }}>
              <Search size={18} aria-hidden="true" />
              <span>No saved searches yet. Use the &quot;Save Search&quot; button on the Browse page.</span>
            </div>
          )}
        </section>
      )}

      {/* {unavailableGroups.map((group) => {
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
      })} */}
    </div>
  );
}

