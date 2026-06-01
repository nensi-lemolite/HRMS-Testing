import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { usePerms } from '../../hooks/usePerms';
import { useAuth } from '../../context/AuthContext';

function fmt(n) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n || 0);
}

export default function PayrollPage() {
  const { can } = usePerms();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(can('payroll.run') ? 'runs' : 'mine');
  const [runs, setRuns] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
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
    if (can('payroll.read.self')) api.get('/payroll/payslips/me').then(({ data }) => setMyPayslips(data.payslips)).catch(() => {});
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
        {can('payroll.read.self') && <button className={`btn ${tab === 'mine' ? 'primary' : ''}`} onClick={() => setTab('mine')}>My Payslips</button>}
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

      {tab === 'mine' && can('payroll.read.self') && (
        <div className="card table-card">
          <table className="modern-table">
            <thead><tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net</th><th></th></tr></thead>
            <tbody>
              {myPayslips.length === 0 ? (
                <tr><td colSpan="5" className="empty">No payslips yet.</td></tr>
              ) : myPayslips.map((p) => (
                <tr key={p._id}>
                  <td><b>{p.period}</b></td>
                  <td>{fmt(p.gross)}</td>
                  <td>{fmt(p.totalDeduction)}</td>
                  <td><b>{fmt(p.net)}</b></td>
                  <td><button className="btn" onClick={() => alert(JSON.stringify(p, null, 2))}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
