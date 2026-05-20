import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Eye, EyeOff, FileText, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ACCEPTED_PROFILE_TYPES = ['image/jpeg', 'image/png'];

const initialState = {
  full_name: '',
  email: '',
  phone: '',
  license_number: '',
  dhsud_registration_number: '',
  password: '',
  password_confirmation: '',
  profile_picture_upload: null,
};

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { first_name: '', last_name: '' };
  }

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: parts[0] };
  }

  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts.at(-1),
  };
}

export default function AgentSignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMismatch = form.password_confirmation.length > 0
    && form.password !== form.password_confirmation;

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFileError('');
    setFieldErrors((current) => ({ ...current, profile_picture_upload: '' }));

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setForm((current) => ({ ...current, profile_picture_upload: null }));
      setPreviewUrl('');
      return;
    }

    if (!ACCEPTED_PROFILE_TYPES.includes(file.type)) {
      setForm((current) => ({ ...current, profile_picture_upload: null }));
      setPreviewUrl('');
      setFileError('Upload a JPG or PNG profile picture.');
      event.target.value = '';
      return;
    }

    setForm((current) => ({ ...current, profile_picture_upload: file }));
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearProfilePicture = () => {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setForm((current) => ({ ...current, profile_picture_upload: null }));
    setPreviewUrl('');
    setFileError('');
  };

  const firstFieldError = (name) => {
    const value = fieldErrors[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (passwordsMismatch) {
      setError('Passwords do not match.');
      return;
    }

    const { first_name, last_name } = splitFullName(form.full_name);
    const payload = new FormData();
    payload.append('first_name', first_name);
    payload.append('last_name', last_name);
    payload.append('email', form.email.trim());
    payload.append('phone', form.phone.trim());
    payload.append('role', 'agent');
    payload.append('license_number', form.license_number.trim());
    payload.append('dhsud_registration_number', form.dhsud_registration_number.trim());
    payload.append('password', form.password);
    payload.append('password_confirmation', form.password_confirmation);

    if (form.profile_picture_upload) {
      payload.append('profile_picture_upload', form.profile_picture_upload);
    }

    setBusy(true);

    try {
      await register(payload);
      const requestedPath = location.state?.from
        ? `${location.state.from.pathname || ''}${location.state.from.search || ''}`
        : '';
      navigate(requestedPath && requestedPath !== '/agent-signup' ? requestedPath : '/dashboard', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
      setFieldErrors(submissionError.details || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell auth-layout agent-signup-layout animate-enter">
      <section className="section-panel auth-panel agent-signup-panel">
        <div className="agent-signup-header">
          <div className="auth-icon-orb">
            <UserPlus size={32} aria-hidden="true" />
          </div>
          <p className="eyebrow flex-row">
            <ShieldCheck size={14} aria-hidden="true" /> Agent Access Portal
          </p>
          <h2>Agent Sign-Up</h2>
          <p>Create a demo-ready real estate professional account for review and dashboard access.</p>
        </div>

        <form className="auth-form agent-signup-form" onSubmit={handleSubmit} aria-label="Agent sign-up form">
          <div className="agent-signup-photo-field">
            <div className="agent-signup-photo-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected profile preview" />
              ) : (
                <UserRound size={32} aria-hidden="true" />
              )}
            </div>
            <div>
              <label htmlFor="profile_picture_upload">Profile Picture Upload</label>
              <input
                accept="image/jpeg,image/png"
                id="profile_picture_upload"
                name="profile_picture_upload"
                onChange={handleFileChange}
                type="file"
              />
              <span className="field-hint">Upload JPG or PNG. This appears on your agent dashboard.</span>
              {form.profile_picture_upload ? (
                <button className="text-button agent-signup-remove-photo" onClick={clearProfilePicture} type="button">
                  <X size={14} aria-hidden="true" /> Remove selected photo
                </button>
              ) : null}
              {fileError ? <span className="field-error">{fileError}</span> : null}
              {firstFieldError('profile_picture_upload') ? <span className="field-error">{firstFieldError('profile_picture_upload')}</span> : null}
            </div>
          </div>

          <div className="field-grid two-up">
            <div>
              <label htmlFor="full_name">Full Name</label>
              <input id="full_name" name="full_name" onChange={updateField} required value={form.full_name} placeholder="e.g. Avery Santos" autoComplete="name" />
              {firstFieldError('first_name') || firstFieldError('last_name') ? <span className="field-error">{firstFieldError('first_name') || firstFieldError('last_name')}</span> : null}
            </div>
            <div>
              <label htmlFor="email">Email Address</label>
              <input id="email" name="email" onChange={updateField} required type="email" value={form.email} placeholder="agent@domain.com" autoComplete="email" />
              {firstFieldError('email') ? <span className="field-error">{firstFieldError('email')}</span> : null}
            </div>
          </div>

          <div className="field-grid two-up">
            <div>
              <label htmlFor="phone">Contact Number</label>
              <input id="phone" name="phone" onChange={updateField} value={form.phone} placeholder="+63 917 123 4567" autoComplete="tel" />
              {firstFieldError('phone') ? <span className="field-error">{firstFieldError('phone')}</span> : null}
            </div>
            <div>
              <label htmlFor="license_number">PRC Accreditation Number</label>
              <input
                id="license_number"
                name="license_number"
                onChange={updateField}
                required
                value={form.license_number}
                placeholder="For demo testing, enter any 5 digits (e.g., 12345)"
                autoComplete="off"
              />
              {firstFieldError('license_number') ? <span className="field-error">{firstFieldError('license_number')}</span> : null}
            </div>
          </div>

          <div>
            <label htmlFor="dhsud_registration_number" className="flex-row" style={{ gap: '0.45rem' }}>
              <FileText size={14} aria-hidden="true" /> DHSUD Registration Number
            </label>
            <input
              id="dhsud_registration_number"
              name="dhsud_registration_number"
              onChange={updateField}
              value={form.dhsud_registration_number}
              placeholder="DHSUD registration number"
              autoComplete="off"
            />
            {firstFieldError('dhsud_registration_number') ? <span className="field-error">{firstFieldError('dhsud_registration_number')}</span> : null}
          </div>

          <div className="field-grid two-up">
            <div>
              <label htmlFor="password">Password</label>
              <div className="auth-password-field">
                <input
                  className={passwordsMismatch ? 'auth-input-mismatch' : undefined}
                  id="password"
                  name="password"
                  onChange={updateField}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  autoComplete="new-password"
                  aria-invalid={passwordsMismatch || undefined}
                  aria-describedby={passwordsMismatch ? 'agent-password-match-error' : undefined}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword
                    ? <EyeOff size={18} aria-hidden="true" />
                    : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
              {firstFieldError('password') ? <span className="field-error">{firstFieldError('password')}</span> : null}
            </div>
            <div>
              <label htmlFor="password_confirmation">Confirm Password</label>
              <div className="auth-password-field">
                <input
                  className={passwordsMismatch ? 'auth-input-mismatch' : undefined}
                  id="password_confirmation"
                  name="password_confirmation"
                  onChange={updateField}
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.password_confirmation}
                  autoComplete="new-password"
                  aria-invalid={passwordsMismatch || undefined}
                  aria-describedby={passwordsMismatch ? 'agent-password-match-error' : undefined}
                />
                <button
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  {showConfirmPassword
                    ? <EyeOff size={18} aria-hidden="true" />
                    : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {passwordsMismatch ? (
            <p className="field-error auth-password-match-error" id="agent-password-match-error" role="alert">
              Passwords do not match.
            </p>
          ) : null}

          {error ? <p className="form-error animate-enter" role="alert" aria-live="assertive">{error}</p> : null}

          <button className="primary-button auth-submit flex-row" disabled={busy || Boolean(fileError)} type="submit">
            {busy ? 'Submitting...' : 'Submit Agent Application'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch">
          Registering as a client? <Link to="/register" className="text-link">Create client account</Link>
          {' '}or{' '}
          <Link to="/login" className="text-link"><BadgeCheck size={14} aria-hidden="true" /> Sign in</Link>
        </p>
      </section>
    </div>
  );
}
