import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { login, register } = useAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      navigate('/dashboard');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="section-panel auth-panel">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
           <div style={{ backgroundColor: 'rgba(197, 168, 128, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem', color: 'var(--brand-base)', border: '1px solid rgba(197, 168, 128, 0.2)' }}>
             {mode === 'login' ? <KeyRound size={32} /> : <UserPlus size={32} />}
           </div>
           <p className="eyebrow flex-row" style={{ gap: '0.4rem', justifyContent: 'center' }}>
             <ShieldCheck size={14} /> Secure Access Portal
           </p>
           <h2 style={{ textAlign: 'center', margin: '0.5rem 0' }}>{title}</h2>
           <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 300, fontSize: '0.95rem' }}>
             {mode === 'login' 
               ? 'Enter your credentials to access the administrative and client tools.' 
               : 'Create a client profile or submit your agent credentials for review.'}
           </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <div className="field-grid two-up">
                <label>
                  First Name
                  <input name="first_name" onChange={handleChange} required value={form.first_name} placeholder="e.g. Avery" />
                </label>
                <label>
                  Last Name
                  <input name="last_name" onChange={handleChange} required value={form.last_name} placeholder="e.g. Davis" />
                </label>
              </div>
              <label>
                Account Type
                <select name="role" onChange={handleChange} value={form.role}>
                  <option value="user">Private Client / Buyer</option>
                  <option value="agent">Real Estate Professional</option>
                </select>
              </label>
            </>
          ) : null}

          <div className="field-grid two-up" style={{ marginTop: mode === 'register' ? '1rem' : 0 }}>
            <label>
              Email Address
              <input name="email" onChange={handleChange} required type="email" value={form.email} placeholder="name@domain.com" />
            </label>
            <label style={{ display: mode === 'register' ? 'block' : 'none' }}>
              Phone Number
              <input name="phone" onChange={handleChange} value={form.phone} placeholder="+1 234 567 890" />
            </label>
          </div>

          {mode === 'register' && form.role === 'agent' ? (
            <>
              <div className="field-grid two-up">
                <label>
                  License Number
                  <input name="license_number" onChange={handleChange} required value={form.license_number} />
                </label>
                <label>
                  Firm/Agency Name
                  <input name="agency_name" onChange={handleChange} value={form.agency_name} placeholder="Independent if none" />
                </label>
              </div>
              <label>
                Professional Biography
                <textarea name="bio" onChange={handleChange} rows="3" value={form.bio} placeholder="Highlight your expertise and sales history." />
              </label>
            </>
          ) : null}

          <div className="field-grid two-up" style={{ marginTop: '1rem' }}>
            <label>
              Secure Password
              <input name="password" onChange={handleChange} required type="password" value={form.password} />
            </label>
            {mode === 'register' ? (
              <label>
                Confirm Password
                <input
                  name="password_confirmation"
                  onChange={handleChange}
                  required
                  type="password"
                  value={form.password_confirmation}
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button auth-submit flex-row" disabled={busy} type="submit" style={{ gap: '0.75rem' }}>
            {busy ? 'Verifying...' : mode === 'login' ? 'Authenticate Access' : 'Submit Application'}
            <ArrowRight size={18} />
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Do not have an account yet?' : 'Have an existing profile?'}{' '}
          <Link to={mode === 'login' ? '/register' : '/login'}>
            {mode === 'login' ? 'Register Now' : 'Sign In'}
          </Link>
        </p>
      </section>
    </div>
  );
}
