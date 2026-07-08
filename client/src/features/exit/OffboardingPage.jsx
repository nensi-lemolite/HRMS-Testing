import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../gamification/gamification.css';
import { listExits } from '../../api/exit';

const EXIT_STATUS = {
  INITIATED: 'warn',
  IN_PROGRESS: 'warn',
  CLEARED: 'acc',
  SETTLED: 'active',
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const clearanceDone = (c) => (c ? ['it', 'hr', 'finance', 'manager'].filter((k) => c[k]).length : 0);

export default function OffboardingPage() {
  const [rows, setRows] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    listExits()
      .then((cs) => { setRows(cs); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  if (state === 'error') return <div className="empty">Couldn’t load offboardings.</div>;
  if (state === 'loading' || !rows) return <div className="empty">Loading…</div>;

  const inProgress = rows.filter((r) => r.status !== 'SETTLED').length;
  const settled = rows.filter((r) => r.status === 'SETTLED').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Offboarding</h1>
          <p className="muted">Resignations, clearance checklists and full &amp; final settlement.</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Total</div><div className="kpi-value">{rows.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">In progress</div><div className="kpi-value">{inProgress}</div></div>
        <div className="kpi-card"><div className="kpi-label">Settled</div><div className="kpi-value">{settled}</div></div>
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead>
            <tr><th>Employee</th><th>Last working day</th><th>Clearances</th><th>Settlement</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="5"><div className="empty small">No offboarding in progress. Start one from an employee’s profile → Exit tab.</div></td></tr>
            ) : (
              rows.map((r) => {
                const emp = r.employee;
                return (
                  <tr key={r._id}>
                    <td className="cell-name">
                      {emp
                        ? <Link to={`/employees/${emp._id}`} className="row-link">{emp.name}</Link>
                        : '—'}
                      {emp?.designation && <div className="cell-sub">{emp.designation}</div>}
                    </td>
                    <td>{fmtDate(r.lastWorkingDay)}</td>
                    <td>{clearanceDone(r.clearance)} / 4</td>
                    <td>{r.finalSettlementAmount != null ? `₹${Number(r.finalSettlementAmount).toLocaleString('en-IN')}` : '—'}</td>
                    <td><span className={'badge ' + (EXIT_STATUS[r.status] || 'warn')}>{(r.status || 'INITIATED').replace('_', ' ')}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>Open an employee to update clearances and settlement.</p>
    </>
  );
}
