import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterCompanyPage() {
  const { registerCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await registerCompany(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-logo">HR</div>
          <h2>HRMS Cloud</h2>
          <p>One platform to run your entire workforce — people, payroll, and everything in between.</p>
          <ul className="auth-points">
            <li>Smart payroll engine</li>
            <li>Effortless leave &amp; attendance</li>
            <li>Role-based access for HR, managers &amp; employees</li>
          </ul>
        </div>
      </div>
      <form className="auth-card form" onSubmit={submit}>
        <h1>Create your workspace</h1>
        <p className="sub">Set up your HRMS in under a minute.</p>
        {error && <div className="error">{error}</div>}
        <label>Company name
          <input value={form.companyName} onChange={set('companyName')} placeholder="Enter company name" required />
        </label>
        <label>Your name
          <input value={form.adminName} onChange={set('adminName')} placeholder="Enter your name" required />
        </label>
        <label>Work email
          <input type="email" value={form.email} onChange={set('email')} placeholder="Enter work email" required />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={set('password')} placeholder="Enter password" required minLength={6} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button>
        <p className="auth-foot">
          Already onboarded? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
