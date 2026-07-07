import '../gamification/gamification.css';
import { projects, bench } from '../gamification/data';

function statusBadge(s) {
  return <span className={'badge ' + (s === 'On track' ? 'active' : 'warn')}>{s}</span>;
}

export default function ProjectsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects &amp; bench</h1>
          <p className="muted">Allocation, utilization and bench across delivery teams.</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Active projects</div><div className="kpi-value">11</div></div>
        <div className="kpi-card"><div className="kpi-label">Billable</div><div className="kpi-value">82%</div><div className="kpi-foot">▲ 4%</div></div>
        <div className="kpi-card"><div className="kpi-label">On bench</div><div className="kpi-value">14</div><div className="kpi-foot">avg 9 days</div></div>
        <div className="kpi-card"><div className="kpi-label">Utilization</div><div className="kpi-value">88%</div></div>
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Project</th><th>Client</th><th>Team</th><th>Stack</th><th>Allocation</th><th>Status</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.name}>
                <td className="cell-name">{p.name}</td>
                <td>{p.client}</td>
                <td>{p.team}</td>
                <td><span className="tag-pill">{p.stack}</span></td>
                <td>{p.alloc}</td>
                <td>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: '22px 0 12px' }}>On bench — ready to allocate</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Engineer</th><th>Primary skills</th><th>Bench since</th><th>Availability</th></tr></thead>
          <tbody>
            {bench.map((b) => (
              <tr key={b.name}>
                <td className="cell-employee"><span className="gm-avatar">{b.initials}</span><span className="cell-name">{b.name}</span></td>
                <td>{b.skills}</td>
                <td>{b.since}</td>
                <td><span className="badge active">{b.avail}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
