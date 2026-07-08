import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { usePerms } from '../../hooks/usePerms';
import { useAuth } from '../../context/AuthContext';
import PayslipModal, { periodParts } from './PayslipModal';

function fmt(n) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
}

export default function PayrollPage() {
  const { can } = usePerms();
  const { user } = useAuth();
  const navigate = useNavigate();
  // A SUPER_ADMIN has no employee record, so no personal payslips.
  const isSuper = user?.role === 'SUPER_ADMIN';
  const canSelf = can('payroll.read.self') && !isSuper;
  const [tab, setTab] = useState(can('payroll.run') || !canSelf ? 'runs' : 'mine');
  const [runs, setRuns] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [tick, setTick] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    country: user?.country || 'IN',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (can('payroll.read.all')) api.get('/payroll/runs').then(({ data }) => setRuns(data.runs)).catch(() => {});
    if (canSelf) api.get('/payroll/payslips/me').then(({ data }) => setMyPayslips(data.payslips)).catch(() => {});
  }, [tick]);

  const createRun = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/payroll/runs', form);
      setShowCreate(false);
      setTick((t) => t + 1);
      navigate(`/payroll/${data.run._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create run');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <p className="muted">Run payroll, generate payslips and view history.</p>
        </div>
        {can('payroll.run') && <button className="btn primary" onClick={() => setShowCreate(true)}>+ Run Payroll</button>}
      </div>

      <div className="tabs-row">
        {can('payroll.read.all') && <button className={`btn ${tab === 'runs' ? 'primary' : ''}`} onClick={() => setTab('runs')}>Runs</button>}
        {canSelf && <button className={`btn ${tab === 'mine' ? 'primary' : ''}`} onClick={() => setTab('mine')}>My Payslips</button>}
      </div>

      {tab === 'runs' && can('payroll.read.all') && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Period</th><th>Region</th><th>Status</th><th>Gross</th><th>Deductions</th><th>Net</th><th></th></tr></thead>
            <tbody>
              {runs.length === 0 ? (
                <tr><td colSpan="7" className="empty">No payroll runs yet. Click "Run Payroll" to start.</td></tr>
              ) : runs.map((r) => (
                <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/payroll/${r._id}`)}>
                  <td><b>{r.period}</b></td>
                  <td>{r.country}</td>
                  <td><span className={`badge ${r.status === 'FINALIZED' ? 'active' : r.status === 'PAID' ? 'active' : 'warn'}`}>{r.status}</span></td>
                  <td>{fmt(r.totals?.gross)}</td>
                  <td>{fmt(r.totals?.deductions)}</td>
                  <td><b>{fmt(r.totals?.net)}</b></td>
                  <td><span className="row-link">Open →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mine' && canSelf && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Month</th><th>Year</th><th style={{ textAlign: 'right' }}>Payslip</th></tr></thead>
            <tbody>
              {myPayslips.length === 0 ? (
                <tr><td colSpan="3" className="empty">No payslips yet.</td></tr>
              ) : myPayslips.map((p) => {
                const { month, year } = periodParts(p.period);
                return (
                  <tr key={p._id}>
                    <td><b>{month}</b></td>
                    <td>{year}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn" onClick={() => setViewPayslip(p)}>View payslip</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewPayslip && (
        <PayslipModal payslip={viewPayslip} employee={{ name: user?.name }} onClose={() => setViewPayslip(null)} />
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => !busy && setShowCreate(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createRun}>
            <div className="modal-icon info">▶</div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Run payroll</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>This will compute payslips for all active employees.</p>
            {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="form" style={{ gap: 12 }}>
              <label>Period (YYYY-MM)<input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" className="btn" onClick={() => setShowCreate(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Running…' : 'Run payroll'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
