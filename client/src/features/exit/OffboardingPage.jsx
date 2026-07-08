import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../gamification/gamification.css';
import { offboarding as ex } from '../gamification/data';
import { listExits } from '../../api/exit';

const EXIT_STATUS = {
  INITIATED: 'warn',
  IN_PROGRESS: 'warn',
  CLEARED: 'acc',
  SETTLED: 'active',
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const clearanceDone = (c) => (c ? ['it', 'hr', 'finance', 'manager'].filter((k) => c[k]).length : 0);

function LiveOffboarding() {
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

export default function OffboardingPage({ demo }) {
  if (!demo) return <LiveOffboarding />;

  // Demo showcase only (dummy data) — illustrates the intended layout.
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Offboarding — {ex.name}</h1>
          <p className="muted">{ex.meta}</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Notice period</div><div className="kpi-value" style={{ fontSize: 18 }}>Served ✓</div></div>
        <div className="kpi-card"><div className="kpi-label">Clearances</div><div className="kpi-value" style={{ fontSize: 18 }}>5 / 7</div></div>
        <div className="kpi-card"><div className="kpi-label">EL to encash</div><div className="kpi-value" style={{ fontSize: 18 }}>14 days</div></div>
        <div className="kpi-card gradient"><div className="kpi-label">Net F&amp;F payable</div><div className="kpi-value" style={{ fontSize: 18 }}>{ex.net}</div></div>
      </div>

      <div className="gm-2col">
        <div className="card">
          <div className="card-head"><h2>Clearance checklist</h2></div>
          {ex.checklist.map((c) => (
            <div className="gm-check" key={c.label}>
              <span className={'gm-box' + (c.state === 'done' ? ' done' : c.state === 'now' ? ' now' : '')}>
                {c.state === 'done' ? '✓' : c.state === 'now' ? '•' : ''}
              </span>
              {c.label}
              <span className="rt">
                {c.state === 'done'
                  ? <span className="muted small">done</span>
                  : c.state === 'now'
                  ? <span className="badge warn">Pending</span>
                  : <span className="muted small">on LWD</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><h2>Full &amp; final settlement</h2></div>
          <div className="gm-subhead">PAYABLES</div>
          {ex.payables.map((p) => (
            <div className="gm-ln" key={p.label}><span>{p.label}</span><span>{p.amount}</span></div>
          ))}
          <div className="gm-ln total"><span>Total payable</span><span>{ex.payableTotal}</span></div>
          <div className="gm-subhead" style={{ marginTop: 12 }}>DEDUCTIONS</div>
          {ex.deductions.map((d) => (
            <div className="gm-ln" key={d.label}><span>{d.label}</span><span>{d.amount}</span></div>
          ))}
          <div className="gm-ln total"><span>Total deductions</span><span>{ex.deductionTotal}</span></div>
          <div className="gm-net"><span>Net F&amp;F payable</span><span>{ex.net}</span></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn">Generate relieving letter</button>
        <button className="btn">Experience letter</button>
        <button className="btn primary">Approve &amp; settle F&amp;F</button>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>
        Illustrative demo. Gratuity applies after 5 years of service; leave encashment and gratuity reuse the payroll engine.
      </p>
    </>
  );
}
