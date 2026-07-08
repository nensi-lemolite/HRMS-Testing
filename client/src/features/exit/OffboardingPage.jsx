import '../gamification/gamification.css';
import { offboarding as ex } from '../gamification/data';

export default function OffboardingPage({ demo }) {
  // Live page: no dummy data. A real per-employee exit/F&F flow isn't built yet,
  // so show an honest empty state instead of the illustrative example.
  if (!demo) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Offboarding</h1>
            <p className="muted">Resignations, clearance checklists and full &amp; final settlement.</p>
          </div>
        </div>
        <div className="card">
          <div className="empty">
            No offboarding in progress.
            <div className="muted small" style={{ marginTop: 6 }}>
              Offboarding is started from an employee’s profile when they resign — clearances and the
              full &amp; final settlement will appear here.
            </div>
          </div>
        </div>
      </>
    );
  }

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
