import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import PayslipModal from './PayslipModal';

function fmt(n) {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
}

export default function PayrollRunPage() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/payroll/runs/${id}`).then(({ data }) => {
    setRun(data.run);
    setPayslips(data.payslips);
  });

  useEffect(() => { load(); }, [id]);

  const finalize = async () => {
    setBusy(true);
    try {
      await api.post(`/payroll/runs/${id}/finalize`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!run) return <div className="empty">Loading…</div>;

  return (
    <div>
      <Link to="/payroll" className="link-muted">← Back to payroll</Link>

      <div className="page-header" style={{ marginTop: 12 }}>
        <div>
          <h1>Payroll · {run.period}</h1>
          <p className="muted">Region: {run.country} · Status: <span className={`badge ${run.status === 'FINALIZED' ? 'active' : 'warn'}`}>{run.status}</span></p>
        </div>
        {run.status === 'DRAFT' && <button className="btn primary" onClick={finalize} disabled={busy}>{busy ? 'Finalizing…' : 'Finalize run'}</button>}
      </div>

      <p className="muted" style={{ margin: '4px 0 16px' }}>
        {payslips.length} employee(s) in this run. Salary is confidential — open a payslip to view amounts.
      </p>

      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Employee</th><th>Department</th><th></th></tr></thead>
          <tbody>
            {payslips.length === 0 ? (
              <tr><td colSpan="3" className="empty">No payslips in this run.</td></tr>
            ) : payslips.map((p) => (
              <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => setViewPayslip(p)}>
                <td>
                  <div className="cell-employee">
                    <div className="avatar small">{(p.employee?.name || '?').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase()}</div>
                    <div>
                      <div className="cell-name">{p.employee?.name}</div>
                      <div className="cell-sub">{p.employee?.empCode}</div>
                    </div>
                  </div>
                </td>
                <td>{p.employee?.department || '—'}</td>
                <td><span className="row-link">View payslip →</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewPayslip && (
        <PayslipModal payslip={viewPayslip} employee={viewPayslip.employee} onClose={() => setViewPayslip(null)} />
      )}
    </div>
  );
}
