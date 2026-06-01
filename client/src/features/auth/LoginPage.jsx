import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-logo">HR</div>
          <h2>Welcome back</h2>
          <p>Sign in to manage your people, payroll and attendance — all from one console.</p>
          <ul className="auth-points">
            <li>Real-time team insights</li>
            <li>Self-service for every employee</li>
            <li>Automated payroll &amp; compliance</li>
          </ul>
        </div>
      </div>
      <form className="auth-card form" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="sub">Use your work email to access your HR console.</p>
        {error && <div className="error">{error}</div>}
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required />
        </label>
        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Password</span>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--primary-600)',
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
                fontWeight: 500,
              }}
            >
              Forgot password?
            </button>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-foot">
          New here? <Link to="/register">Register your company</Link>
        </p>
      </form>

      {resetOpen && <ResetPasswordModal onClose={() => setResetOpen(false)} />}
    </div>
  );
}

function ResetPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    // No self-service flow yet — show a clear, honest next-step so users
    // know exactly who to contact.
    setSent(true);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--primary-50)', color: 'var(--primary-600)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}
          >🔑</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Reset your password</h2>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {sent
                ? 'Your HR administrator can issue a new password for you.'
                : 'Tell us your work email and we’ll route the request to your HR administrator.'}
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {sent ? (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--primary-50)',
                  border: '1px solid var(--primary-100)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--primary-600)',
                  lineHeight: 1.55,
                  marginBottom: 14,
                }}
              >
                Thanks. Please ask your <b>HR administrator</b> to issue a new
                password from the <b>Employees → your profile → Reset password</b>{' '}
                action. The new password will be shown to them once so they can
                share it with you securely.
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                If you are an HR administrator yourself and have lost access,
                contact your Super Admin.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button className="btn primary" onClick={onClose}>Got it</button>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@company.com"
                  style={{
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn primary">Send request</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
