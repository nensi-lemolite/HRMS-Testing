import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { usePerms } from '../../hooks/usePerms';
import { useAuth } from '../../context/AuthContext';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—'; }

export default function LeavePage() {
  const { can } = usePerms();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const allowPersonal = can('leave.apply') && !isSuperAdmin && !!user?.employee;
  const canManageTypes = can('leave.read.all');

  const initialTab = canManageTypes
    ? 'approvals'
    : (allowPersonal ? 'apply' : 'mine');

  const [tab, setTab] = useState(initialTab);
  const [types, setTypes] = useState([]);
  const [balance, setBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pending, setPending] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [tick, setTick] = useState(0);

  const [form, setForm] = useState({ type: '', from: '', to: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Types admin
  const [adminTypes, setAdminTypes] = useState([]);
  const [typeForm, setTypeForm] = useState({ code: '', name: '', annualQuota: 0, carryForward: 0 });
  const [typeEditing, setTypeEditing] = useState(null);
  const [typeError, setTypeError] = useState('');
  const [typeBusy, setTypeBusy] = useState(false);

  useEffect(() => {
    api.get('/leave/types').then(({ data }) => {
      setTypes(data.types);
      if (data.types[0]) setForm((f) => ({ ...f, type: f.type || data.types[0].code }));
    }).catch(() => {});

    if (allowPersonal) {
      api.get('/leave/balance/me').then(({ data }) => setBalance(data.balance)).catch(() => {});
      api.get('/leave/my').then(({ data }) => setMyLeaves(data.leaves)).catch(() => {});
    }
    if (can('leave.approve.all')) {
      api.get('/leave/pending').then(({ data }) => setPending(data.leaves)).catch(() => {});
    }
    if (can('leave.read.all')) {
      api.get('/leave/all').then(({ data }) => setAllLeaves(data.leaves)).catch(() => {});
      api.get('/leave/types-admin').then(({ data }) => setAdminTypes(data.types)).catch(() => {});
    }
  }, [tick]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/leave/apply', form);
      setForm({ type: types[0]?.code || '', from: '', to: '', reason: '' });
      setTick((t) => t + 1);
      setTab('mine');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id, decision) => {
    await api.patch(`/leave/${id}/decide`, { decision });
    setTick((t) => t + 1);
  };

  const balances = useMemo(() => {
    if (!balance?.balances) return [];
    return Object.entries(balance.balances).map(([code, n]) => ({ code, n }));
  }, [balance]);

  const startEditType = (t) => {
    setTypeError('');
    setTypeEditing(t._id);
    setTypeForm({
      code: t.code, name: t.name,
      annualQuota: t.annualQuota, carryForward: t.carryForward || 0,
    });
  };
  const cancelEditType = () => {
    setTypeEditing(null);
    setTypeForm({ code: '', name: '', annualQuota: 0, carryForward: 0 });
    setTypeError('');
  };
  const saveType = async (e) => {
    e.preventDefault();
    setTypeError(''); setTypeBusy(true);
    try {
      if (typeEditing) {
        await api.patch(`/leave/types-admin/${typeEditing}`, typeForm);
      } else {
        await api.post('/leave/types-admin', typeForm);
      }
      cancelEditType();
      setTick((t) => t + 1);
    } catch (err) {
      setTypeError(err.response?.data?.error || 'Failed to save');
    } finally { setTypeBusy(false); }
  };
  const deleteType = async (t) => {
    if (!confirm(`Delete leave type "${t.code} — ${t.name}"?`)) return;
    try {
      await api.delete(`/leave/types-admin/${t._id}`);
      setTick((x) => x + 1);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };
  const toggleTypeActive = async (t) => {
    await api.patch(`/leave/types-admin/${t._id}`, { isActive: !t.isActive });
    setTick((x) => x + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leave</h1>
          <p className="muted">Apply for leave, review requests and configure types.</p>
        </div>
      </div>

      {allowPersonal && balances.length > 0 && (
        <div className="kpi-row" style={{ gridTemplateColumns: `repeat(${Math.min(balances.length, 4)}, 1fr)` }}>
          {balances.map((b) => (
            <div key={b.code} className="kpi-card">
              <div className="kpi-label">{b.code} balance</div>
              <div className="kpi-value">{b.n}</div>
              <div className="kpi-foot">days remaining</div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs-row">
        {allowPersonal && <button className={`btn ${tab === 'apply' ? 'primary' : ''}`} onClick={() => setTab('apply')}>Apply</button>}
        {allowPersonal && <button className={`btn ${tab === 'mine' ? 'primary' : ''}`} onClick={() => setTab('mine')}>My Requests</button>}
        {can('leave.approve.all') && <button className={`btn ${tab === 'approvals' ? 'primary' : ''}`} onClick={() => setTab('approvals')}>Approvals ({pending.length})</button>}
        {can('leave.read.all') && <button className={`btn ${tab === 'all' ? 'primary' : ''}`} onClick={() => setTab('all')}>All Requests</button>}
        {canManageTypes && <button className={`btn ${tab === 'types' ? 'primary' : ''}`} onClick={() => setTab('types')}>Types</button>}
      </div>

      {tab === 'apply' && allowPersonal && (
        <form className="card form" onSubmit={submit} style={{ maxWidth: 540 }}>
          {error && <div className="error">{error}</div>}
          <h2>Apply for leave</h2>
          <div className="form-grid">
            <label>Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                {types.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.name}</option>)}
              </select>
            </label>
            <label>From<input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required /></label>
            <label>To<input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required /></label>
          </div>
          <label>Reason
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Enter reason" />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button>
          </div>
        </form>
      )}

      {tab === 'mine' && allowPersonal && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>
              {myLeaves.length === 0 ? (
                <tr><td colSpan="6" className="empty">No leave requests yet.</td></tr>
              ) : myLeaves.map((l) => (
                <tr key={l._id}>
                  <td><span className="tag-pill">{l.type}</span></td>
                  <td>{fmtDate(l.from)}</td>
                  <td>{fmtDate(l.to)}</td>
                  <td>{l.days}</td>
                  <td><span className={`badge ${l.status === 'APPROVED' ? 'active' : l.status === 'REJECTED' ? 'exited' : 'warn'}`}>{l.status}</span></td>
                  <td>{fmtDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'approvals' && can('leave.approve.all') && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {pending.length === 0 ? (
                <tr><td colSpan="7" className="empty">No pending requests.</td></tr>
              ) : pending.map((l) => (
                <tr key={l._id}>
                  <td>
                    <div className="cell-name">{l.employee?.name}</div>
                    <div className="cell-sub">{l.employee?.empCode}</div>
                  </td>
                  <td><span className="tag-pill">{l.type}</span></td>
                  <td>{fmtDate(l.from)}</td>
                  <td>{fmtDate(l.to)}</td>
                  <td>{l.days}</td>
                  <td className="muted small">{l.reason || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => decide(l._id, 'APPROVED')}>Approve</button>
                      <button className="btn danger" onClick={() => decide(l._id, 'REJECTED')}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'all' && can('leave.read.all') && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {allLeaves.length === 0 ? (
                <tr><td colSpan="6" className="empty">No leave records yet.</td></tr>
              ) : allLeaves.map((l) => (
                <tr key={l._id}>
                  <td>
                    <div className="cell-name">{l.employee?.name}</div>
                    <div className="cell-sub">{l.employee?.empCode}</div>
                  </td>
                  <td><span className="tag-pill">{l.type}</span></td>
                  <td>{fmtDate(l.from)}</td>
                  <td>{fmtDate(l.to)}</td>
                  <td>{l.days}</td>
                  <td><span className={`badge ${l.status === 'APPROVED' ? 'active' : l.status === 'REJECTED' ? 'exited' : 'warn'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'types' && canManageTypes && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head"><h2>{typeEditing ? 'Edit leave type' : 'Add leave type'}</h2></div>
            <form className="form" onSubmit={saveType}>
              {typeError && <div className="error">{typeError}</div>}
              <div className="form-grid">
                <label>Code<input value={typeForm.code} disabled={!!typeEditing} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="Enter code" required /></label>
                <label>Name<input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Enter name" required /></label>
                <label>Annual quota (days)<input type="number" min="0" value={typeForm.annualQuota} onChange={(e) => setTypeForm({ ...typeForm, annualQuota: Number(e.target.value) || 0 })} /></label>
                <label>Carry forward (days)<input type="number" min="0" value={typeForm.carryForward} onChange={(e) => setTypeForm({ ...typeForm, carryForward: Number(e.target.value) || 0 })} /></label>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn primary" type="submit" disabled={typeBusy}>{typeBusy ? 'Saving…' : typeEditing ? 'Save changes' : 'Add type'}</button>
                {typeEditing && <button className="btn" type="button" onClick={cancelEditType}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="card table-card">
            <table className="modern-table">
              <thead><tr><th>Code</th><th>Name</th><th>Annual quota</th><th>Carry forward</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {adminTypes.length === 0 ? (
                  <tr><td colSpan="6" className="empty">No leave types yet.</td></tr>
                ) : adminTypes.map((t) => (
                  <tr key={t._id}>
                    <td><code>{t.code}</code></td>
                    <td>{t.name}</td>
                    <td>{t.annualQuota}</td>
                    <td>{t.carryForward}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={t.isActive} onChange={() => toggleTypeActive(t)} />
                        <span className="switch-slider" />
                      </label>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="row-icon-btn" title="Edit" onClick={() => startEditType(t)}>✎</button>
                        <button className="row-icon-btn danger" title="Delete" onClick={() => deleteType(t)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
