import './gamification.css';
import { earningRules, badgeTriggers, levelThresholds, rewardCatalog } from './data';

function StatusBadge({ value }) {
  if (value === true) return <span className="badge active">On</span>;
  if (value === false) return <span className="badge exited">Off</span>;
  const cls = value === 'Active' ? 'active' : value === 'Low stock' ? 'warn' : 'exited';
  return <span className={'badge ' + cls}>{value}</span>;
}

export default function RewardsAdminPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rewards admin 🎮</h1>
          <p className="muted">Configure how points, badges and rewards work — admins only.</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Coins issued (MTD)</div><div className="kpi-value">48.2k</div></div>
        <div className="kpi-card"><div className="kpi-label">Coins redeemed</div><div className="kpi-value">31.6k</div></div>
        <div className="kpi-card"><div className="kpi-label">Active badges</div><div className="kpi-value">16</div></div>
        <div className="kpi-card"><div className="kpi-label">Monthly budget</div><div className="kpi-value">₹25k</div></div>
      </div>

      <h2 style={{ margin: '4px 0 12px' }}>Earning rules</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Event</th><th>XP</th><th>Coins</th><th>Cap</th><th>Status</th></tr></thead>
          <tbody>
            {earningRules.map((r) => (
              <tr key={r.event}>
                <td>{r.event}</td><td>{r.xp}</td><td>{r.coins}</td><td>{r.cap}</td>
                <td><StatusBadge value={r.on} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gm-2col" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Badge triggers</h2></div>
          <ul className="gm-goals">
            {badgeTriggers.map((b) => (
              <li key={b.name}><span>{b.emoji}</span> {b.name}<span className="g-val">{b.rule}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-head"><h2>Level thresholds</h2></div>
          <ul className="gm-goals">
            {levelThresholds.map((l) => (
              <li key={l.level}>Level {l.level} · {l.name}<span className="g-val">{l.xp}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <h2 style={{ margin: '20px 0 12px' }}>Reward catalog</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Reward</th><th>Cost</th><th>Stock</th><th>Redeemed (MTD)</th><th>Status</th></tr></thead>
          <tbody>
            {rewardCatalog.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td><td>🪙 {r.cost}</td><td>{r.stock}</td><td>{r.redeemed}</td>
                <td><StatusBadge value={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
