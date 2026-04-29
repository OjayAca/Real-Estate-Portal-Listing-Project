import { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

const initialState = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'user',
  license_number: '',
  agency_name: '',
  bio: '',
  password: '',
  password_confirmation: '',
};

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const title = useMemo(() => (mode === 'login' ? 'Welcome Back' : 'Join EstateFlow'), [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate(from, { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout animate-enter">
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
               : 'Create a client profile or submit your agent credentials for review.'}
           </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} aria-label={`${title} form`}>
          {mode === 'register' ? (
            <>
              <div className="field-grid two-up">
                <label>
                  <span>First Name</span>
                  <input name="first_name" onChange={handleChange} required value={form.first_name} placeholder="e.g. Avery" aria-label="First name" />
                </label>
                <label>
                  <span>Last Name</span>
                  <input name="last_name" onChange={handleChange} required value={form.last_name} placeholder="e.g. Davis" aria-label="Last name" />
                </label>
              </div>
              <label>
                <span>Account Type</span>
                <select name="role" onChange={handleChange} value={form.role} aria-label="Account type">
                  <option value="user">Private Client / Buyer</option>
                  <option value="agent">Real Estate Professional</option>
                </select>
              </label>
            </>
          ) : null}

          <div className="field-grid two-up" style={{ marginTop: mode === 'register' ? '1rem' : 0 }}>
            <label>
              <span>Email Address</span>
              <input name="email" onChange={handleChange} required type="email" value={form.email} placeholder="name@domain.com" aria-label="Email address" />
            </label>
            <label style={{ display: mode === 'register' ? 'block' : 'none' }}>
              <span>Phone Number</span>
              <input name="phone" onChange={handleChange} value={form.phone} placeholder="+1 234 567 890" aria-label="Phone number" />
            </label>
          </div>

          {mode === 'register' && form.role === 'agent' ? (
            <div className="animate-enter">
              <div className="field-grid two-up">
                <label>
                  <span>License Number</span>
                  <input name="license_number" onChange={handleChange} required value={form.license_number} aria-label="Real estate license number" />
                </label>
                <label>
                  <span>Firm/Agency Name</span>
                  <input name="agency_name" onChange={handleChange} value={form.agency_name} placeholder="Independent if none" aria-label="Agency name" />
                </label>
              </div>
              <label>
                <span>Professional Biography</span>
                <textarea name="bio" onChange={handleChange} rows="3" value={form.bio} placeholder="Highlight your expertise and sales history." aria-label="Professional biography" />
              </label>
            </div>
          ) : null}

          <div className="field-grid two-up" style={{ marginTop: '1rem' }}>
            <label>
              <span>Secure Password</span>
              <input name="password" onChange={handleChange} required type="password" value={form.password} aria-label="Password" />
            </label>
            {mode === 'register' ? (
              <label>
                <span>Confirm Password</span>
                <input
                  name="password_confirmation"
                  onChange={handleChange}
                  required
                  type="password"
                  value={form.password_confirmation}
                  aria-label="Confirm password"
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="form-error animate-enter" role="alert" aria-live="assertive">{error}</p> : null}

          <button className="primary-button auth-submit flex-row" disabled={busy} type="submit" style={{ gap: '0.75rem', marginTop: '2rem' }} aria-label={mode === 'login' ? 'Authenticate Access' : 'Submit Application'}>
            {busy ? 'Verifying...' : mode === 'login' ? 'Authenticate Access' : 'Submit Application'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Do not have an account yet?' : 'Have an existing profile?'}{' '}
          <Link to={mode === 'login' ? '/register' : '/login'} className="text-link">
            {mode === 'login' ? 'Register Now' : 'Sign In'}
          </Link>
        </p>
      </section>
    </div>
  );
}
