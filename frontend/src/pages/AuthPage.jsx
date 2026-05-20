import { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, UserPlus } from 'lucide-react';

const initialState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
};

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { forgotPassword, login, register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const fromLocation = location.state?.from;
  const passwordsMismatch = mode === 'register'
    && form.password_confirmation.length > 0
    && form.password !== form.password_confirmation;

  const resolvePostAuthPath = (authUser) => {
    const requestedPath = fromLocation
      ? `${fromLocation.pathname || ''}${fromLocation.search || ''}`
      : '';

    if (requestedPath && requestedPath !== '/dashboard') {
      return requestedPath;
    }

    return authUser?.role === 'user' ? '/saved-properties' : '/dashboard';
  };

  const title = useMemo(() => (mode === 'login' ? 'Welcome Back' : 'Join EstateFlow'), [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openForgotPassword = () => {
    setForgotOpen(true);
    setForgotEmail((current) => current || form.email);
    setForgotError('');
    setForgotMessage('');
  };

  const handleForgotEmailChange = (event) => {
    setForgotEmail(event.target.value);
    setForgotError('');
    setForgotMessage('');
  };

  const handleForgotSubmit = async () => {
    const email = forgotEmail.trim();

    if (!email) {
      setForgotError('Enter the email address for your account.');
      return;
    }

    setForgotBusy(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const response = await forgotPassword({ email });
      setForgotMessage(response.message || 'Password reset instructions have been sent.');
    } catch (forgotPasswordError) {
      setForgotError(forgotPasswordError.message);
    } finally {
      setForgotBusy(false);
    }
  };

  const handleForgotKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleForgotSubmit();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      let response;
      if (mode === 'login') {
        response = await login({ email: form.email, password: form.password });
      } else {
        response = await register({ ...form, role: 'user' });
      }
      navigate(resolvePostAuthPath(response.user), { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell auth-layout animate-enter">
      <section className="section-panel auth-panel">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ backgroundColor: 'rgba(197, 168, 128, 0.08)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1rem', color: 'var(--brand-base)', border: '1px solid rgba(197, 168, 128, 0.2)', boxShadow: 'var(--glow-gold)' }}>
            {mode === 'login' ? <KeyRound size={32} aria-hidden="true" /> : <UserPlus size={32} aria-hidden="true" />}
          </div>
          <p className="eyebrow flex-row" style={{ gap: '0.4rem', justifyContent: 'center' }}>
            <ShieldCheck size={14} aria-hidden="true" /> Secure Access Portal
          </p>
          <h2 style={{ textAlign: 'center', margin: '0.5rem 0', fontWeight: 300 }}>{title}</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 300, fontSize: '1rem', lineHeight: '1.6' }}>
            {mode === 'login'
              ? 'Enter your credentials to access the administrative and client tools.'
              : 'Create a client profile to save properties, inquiries, and viewing requests.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} aria-label={`${title} form`}>
          {mode === 'register' ? (
            <>
              <div className="field-grid two-up">
                <div>
                  <label htmlFor="first_name">First Name</label>
                  <input id="first_name" name="first_name" onChange={handleChange} required value={form.first_name} placeholder="e.g. Avery" autoComplete="given-name" />
                </div>
                <div>
                  <label htmlFor="last_name">Last Name</label>
                  <input id="last_name" name="last_name" onChange={handleChange} required value={form.last_name} placeholder="e.g. Davis" autoComplete="family-name" />
                </div>
              </div>
            </>
          ) : null}

          <div className={mode === 'register' ? 'field-grid two-up' : 'auth-single-field'} style={{ marginTop: mode === 'register' ? '1rem' : 0 }}>
            <div>
              <label htmlFor="email">Email Address</label>
              <input id="email" name="email" onChange={handleChange} required type="email" value={form.email} placeholder="name@domain.com" autoComplete="email" />
            </div>
            <div style={{ display: mode === 'register' ? 'block' : 'none' }}>
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" name="phone" onChange={handleChange} value={form.phone} placeholder="+1 234 567 890" autoComplete="tel" />
            </div>
          </div>

          <div className={mode === 'register' ? 'field-grid two-up' : 'auth-single-field'} style={{ marginTop: '1rem' }}>
            <div>
              <label htmlFor="password">Password</label>
              <div className="auth-password-field">
                <input
                  className={passwordsMismatch ? 'auth-input-mismatch' : undefined}
                  id="password"
                  name="password"
                  onChange={handleChange}
                  required
                  type={mode === 'login' ? (showLoginPassword ? 'text' : 'password') : (showRegisterPassword ? 'text' : 'password')}
                  value={form.password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  aria-invalid={passwordsMismatch || undefined}
                  aria-describedby={passwordsMismatch ? 'password-match-error' : undefined}
                />
                <button
                  aria-label={
                    mode === 'login'
                      ? (showLoginPassword ? 'Hide password' : 'Show password')
                      : (showRegisterPassword ? 'Hide password' : 'Show password')
                  }
                  className="auth-password-toggle"
                  onClick={() => {
                    if (mode === 'login') {
                      setShowLoginPassword((current) => !current);
                    } else {
                      setShowRegisterPassword((current) => !current);
                    }
                  }}
                  type="button"
                >
                  {(mode === 'login' ? showLoginPassword : showRegisterPassword)
                    ? <EyeOff size={18} aria-hidden="true" />
                    : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
            {mode === 'register' ? (
              <div>
                <label htmlFor="password_confirmation">Confirm Password</label>
                <div className="auth-password-field">
                  <input
                    className={passwordsMismatch ? 'auth-input-mismatch' : undefined}
                    id="password_confirmation"
                    name="password_confirmation"
                    onChange={handleChange}
                    required
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={form.password_confirmation}
                    autoComplete="new-password"
                    aria-invalid={passwordsMismatch || undefined}
                    aria-describedby={passwordsMismatch ? 'password-match-error' : undefined}
                  />
                  <button
                    aria-label={showRegisterConfirmPassword ? 'Hide password' : 'Show password'}
                    className="auth-password-toggle"
                    onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                    type="button"
                  >
                    {showRegisterConfirmPassword
                      ? <EyeOff size={18} aria-hidden="true" />
                      : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {mode === 'register' ? (
            <>
              {passwordsMismatch ? (
                <p className="field-error auth-password-match-error" id="password-match-error" role="alert">
                  Passwords do not match.
                </p>
              ) : null}
            </>
          ) : null}

          {mode === 'login' ? (
            <div className="forgot-password-block">
              <button
                aria-controls="forgot-password-panel"
                aria-expanded={forgotOpen}
                className="text-button forgot-password-link"
                onClick={openForgotPassword}
                type="button"
              >
                Forgot your password?
              </button>

              {forgotOpen ? (
                <div className="forgot-password-panel animate-enter" id="forgot-password-panel">
                  <label htmlFor="forgot_email">Recovery Email</label>
                  <div className="forgot-password-actions">
                    <input
                      id="forgot_email"
                      name="forgot_email"
                      onChange={handleForgotEmailChange}
                      onKeyDown={handleForgotKeyDown}
                      placeholder="name@domain.com"
                      type="email"
                      value={forgotEmail}
                      autoComplete="email"
                    />
                    <button className="ghost-button" disabled={forgotBusy} onClick={handleForgotSubmit} type="button">
                      {forgotBusy ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                  {forgotError ? <p className="form-error compact-message" role="alert" aria-live="assertive">{forgotError}</p> : null}
                  {forgotMessage ? <p className="form-success compact-message" role="status" aria-live="polite">{forgotMessage}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="form-error animate-enter" role="alert" aria-live="assertive">{error}</p> : null}

          <button className="primary-button auth-submit flex-row" disabled={busy} type="submit" style={{ gap: '0.75rem', marginTop: '2rem' }} aria-label={mode === 'login' ? 'Login' : 'Submit Application'}>
            {busy ? 'Verifying...' : mode === 'login' ? 'Login' : 'Submit Application'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Do not have an account yet?' : 'Have an existing profile?'}{' '}
          <Link to={mode === 'login' ? '/register' : '/login'} className="text-link">
            {mode === 'login' ? 'Register Now' : 'Sign In'}
          </Link>
          {mode === 'register' ? (
            <>
              {' '}or{' '}
              <Link to="/agent-signup" className="text-link">Register as an agent</Link>
            </>
          ) : null}
        </p>
      </section>
    </div>
  );
}
