import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';

function TagInput({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const v = (raw ?? draft).trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  const remove = (t) => onChange(value.filter((x) => x !== t));
  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        padding: '6px 8px', minHeight: 42,
        border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.querySelector('input')?.focus(); }}
    >
      {value.map((t) => (
        <span
          key={t}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'var(--primary-50)', color: 'var(--primary-600)',
            padding: '4px 4px 4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 500,
          }}
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary-600)', fontSize: 16, lineHeight: 1, padding: '0 6px' }}
            aria-label={`Remove ${t}`}
          >×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add()}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', padding: '6px 4px', fontSize: 14, background: 'transparent' }}
      />
    </div>
  );
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const EMPTY_FORM = {
  empCode: '',
  name: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  maritalStatus: '',
  bloodGroup: '',
  department: '',
  designation: '',
  joinDate: new Date().toISOString().slice(0, 10),
  probationEndDate: '',
  employmentType: 'FULL_TIME',
  workLocation: '',
  officeBranch: '',
  team: '',
  grade: '',
  workMode: 'WFO',
  shiftAssignment: '',
  workHours: '',
  skills: [],
  technologyStack: [],
  experienceYears: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
};

export default function EmployeeFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [createLogin, setCreateLogin] = useState(true);
  const [loginPassword, setLoginPassword] = useState(generateTempPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/settings/departments').catch(() => ({ data: { items: [] } })),
      api.get('/settings/designations').catch(() => ({ data: { items: [] } })),
    ]).then(([dep, des]) => {
      setDepartments(dep.data.items || []);
      setDesignations(des.data.items || []);
    });
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const buildPayload = () => {
    const {
      skills, technologyStack,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      experienceYears, workHours,
      ...rest
    } = form;
    const payload = { ...rest };
    payload.skills = skills;
    payload.technologyStack = technologyStack;
    payload.emergencyContact = {
      name: emergencyContactName,
      phone: emergencyContactPhone,
      relation: emergencyContactRelation,
    };
    if (experienceYears !== '') payload.experienceYears = Number(experienceYears);
    if (workHours !== '') payload.workHours = Number(workHours);
    // Strip empties so optional fields stay unset
    Object.keys(payload).forEach((k) => {
      const v = payload[k];
      if (v === '' || v === undefined) delete payload[k];
      else if (Array.isArray(v) && v.length === 0) delete payload[k];
    });
    return payload;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const payload = buildPayload();
      if (createLogin) {
        if (!form.email) throw { response: { data: { error: 'Email is required to create a login' } } };
        if (loginPassword.length < 6) throw { response: { data: { error: 'Password must be at least 6 characters' } } };
        payload.loginPassword = loginPassword;
      }
      const { data } = await api.post('/employees', payload);
      if (data.login) {
        setCreatedEmployee(data.employee);
        setTempPassword(loginPassword);
      } else {
        navigate('/employees');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  if (createdEmployee) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Employee added</h1>
            <p className="muted"><b>{createdEmployee.name}</b> has been added to your workspace.</p>
          </div>
        </div>
        <div className="card credentials-card">
          <div className="credentials-head">
            <div className="credentials-icon">🔑</div>
            <div>
              <div className="credentials-title">Temporary password</div>
              <div className="credentials-sub">Share this with the employee. It will not be shown again.</div>
            </div>
          </div>
          <div className="credentials-pwd">
            <code>{tempPassword}</code>
            <button type="button" className="btn" onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="muted small" style={{ marginTop: 14 }}>
            The employee should change this password on first sign-in.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn primary" onClick={() => navigate(`/employees/${createdEmployee._id}`)}>Open profile</button>
            <button className="btn" onClick={() => navigate('/employees')}>Done</button>
            <button className="btn" onClick={() => {
              setCreatedEmployee(null);
              setTempPassword('');
              setForm(EMPTY_FORM);
              setLoginPassword(generateTempPassword());
            }}>Add another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/employees" className="link-muted">← Back to employees</Link>
      <div className="page-header" style={{ marginTop: 12 }}>
        <div>
          <h1>Add Employee</h1>
          <p className="muted">Capture the essentials. You can add documents, assets and performance from the employee profile after saving.</p>
        </div>
      </div>

      <form className="card" onSubmit={submit} style={{ maxWidth: 880 }}>
        <div className="form">
          {error && <div className="error">{error}</div>}

          <h2>Basic info</h2>
          <div className="form-grid">
            <label>Employee Code<input value={form.empCode} onChange={set('empCode')} placeholder="Enter employee code" required /></label>
            <label>Full Name<input value={form.name} onChange={set('name')} placeholder="Enter full name" required /></label>
            <label>Email<input type="email" value={form.email} onChange={set('email')} placeholder="Enter email" /></label>
            <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="Enter phone" /></label>
            <label>Date of birth<input type="date" value={form.dob} onChange={set('dob')} /></label>
            <label>Gender
              <select value={form.gender} onChange={set('gender')}>
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </label>
            <label>Marital status
              <select value={form.maritalStatus} onChange={set('maritalStatus')}>
                <option value="">—</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </label>
            <label>Blood group<input value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="e.g. O+" /></label>
          </div>

          <h2 style={{ marginTop: 24 }}>Employment details</h2>
          <div className="form-grid">
            <label>Department
              <select value={form.department} onChange={set('department')}>
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>Designation
              <select value={form.designation} onChange={set('designation')}>
                <option value="">— Select designation —</option>
                {designations.map((d) => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>Join Date<input type="date" value={form.joinDate} onChange={set('joinDate')} required /></label>
            <label>Probation end<input type="date" value={form.probationEndDate} onChange={set('probationEndDate')} /></label>
            <label>Employment type
              <select value={form.employmentType} onChange={set('employmentType')}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </label>
            <label>Work location<input value={form.workLocation} onChange={set('workLocation')} placeholder="City" /></label>
            <label>Office branch<input value={form.officeBranch} onChange={set('officeBranch')} placeholder="Branch" /></label>
          </div>

          <h2 style={{ marginTop: 24 }}>Organization</h2>
          <div className="form-grid">
            <label>Team<input value={form.team} onChange={set('team')} placeholder="e.g. Platform" /></label>
            <label>Grade / Level<input value={form.grade} onChange={set('grade')} placeholder="L1, L2, Senior…" /></label>
          </div>

          <h2 style={{ marginTop: 24 }}>Shift & work mode</h2>
          <div className="form-grid">
            <label>Work mode
              <select value={form.workMode} onChange={set('workMode')}>
                <option value="WFO">Work from office</option>
                <option value="WFH">Work from home</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </label>
            <label>Shift<input value={form.shiftAssignment} onChange={set('shiftAssignment')} placeholder="e.g. 9 AM – 6 PM" /></label>
            <label>Work hours / day<input type="number" min="0" step="0.5" value={form.workHours} onChange={set('workHours')} placeholder="8" /></label>
          </div>

          <h2 style={{ marginTop: 24 }}>Skills &amp; experience</h2>
          <div className="form-grid">
            <label>Skills
              <TagInput
                value={form.skills}
                onChange={(v) => setForm({ ...form, skills: v })}
                placeholder="Type a skill and press Enter"
              />
            </label>
            <label>Tech stack
              <TagInput
                value={form.technologyStack}
                onChange={(v) => setForm({ ...form, technologyStack: v })}
                placeholder="Type a tech and press Enter"
              />
            </label>
            <label>Experience (years)<input type="number" min="0" step="0.5" value={form.experienceYears} onChange={set('experienceYears')} /></label>
          </div>

          <h2 style={{ marginTop: 24 }}>Emergency contact</h2>
          <div className="form-grid">
            <label>Name<input value={form.emergencyContactName} onChange={set('emergencyContactName')} /></label>
            <label>Phone<input value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} /></label>
            <label>Relation<input value={form.emergencyContactRelation} onChange={set('emergencyContactRelation')} placeholder="Spouse / Parent…" /></label>
          </div>

          <div className="login-block">
            <div className="login-block-head">
              <label className="switch">
                <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} />
                <span className="switch-slider" />
              </label>
              <div>
                <div className="login-block-title">Enable sign-in for this employee</div>
                <div className="login-block-sub">Generates a temporary password the employee can use to sign in.</div>
              </div>
            </div>

            {createLogin && (
              <div style={{ marginTop: 14, maxWidth: 380 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Temporary password
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      minLength={6}
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}
                    />
                    <button type="button" className="btn" onClick={() => setShowPassword(!showPassword)} title="Show / hide">{showPassword ? '🙈' : '👁'}</button>
                    <button type="button" className="btn" onClick={() => setLoginPassword(generateTempPassword())}>Generate</button>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save employee'}</button>
            <button className="btn" type="button" onClick={() => navigate('/employees')}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
