import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  
  const [form, setForm] = useState({
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !token) {
      setError('Invalid or missing reset token.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await resetPassword({ 
        email, 
        token, 
        password: form.password, 
        password_confirmation: form.password_confirmation 
      });
      setSuccess(response.message || 'Password has been successfully reset. You can now sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
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
             <KeyRound size={32} aria-hidden="true" />
           </div>
           <p className="eyebrow flex-row" style={{ gap: '0.4rem', justifyContent: 'center' }}>
             <ShieldCheck size={14} aria-hidden="true" /> Secure Access Portal
           </p>
           <h2 style={{ textAlign: 'center', margin: '0.5rem 0', fontWeight: 300 }}>Reset Password</h2>
           <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 300, fontSize: '1rem', lineHeight: '1.6' }}>
             Create a new password for your account.
           </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} aria-label="Reset password form">
          <div className="field-grid two-up">
            <div>
              <label htmlFor="password">New Password</label>
              <input id="password" name="password" onChange={handleChange} required type="password" value={form.password} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="password_confirmation">Confirm Password</label>
              <input
                id="password_confirmation"
                name="password_confirmation"
                onChange={handleChange}
                required
                type="password"
                value={form.password_confirmation}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error ? <p className="form-error animate-enter" role="alert" aria-live="assertive" style={{ marginTop: '1rem' }}>{error}</p> : null}
          {success ? <p className="form-success animate-enter" role="status" aria-live="polite" style={{ marginTop: '1rem' }}>{success}</p> : null}

          <button className="primary-button auth-submit flex-row" disabled={busy || !!success} type="submit" style={{ gap: '0.75rem', marginTop: '2rem' }} aria-label="Save new password">
            {busy ? 'Saving...' : 'Save New Password'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>

        <p className="auth-switch">
          <Link to="/login" className="text-link">
            Back to Sign In
          </Link>
        </p>
      </section>
    </div>
  );
}
