import { useState, useEffect } from 'react';
import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import * as gapi from '../../api/gamification';

function StatusBadge({ value }) {
  if (value === true) return <span className="badge active">On</span>;
  if (value === false) return <span className="badge exited">Off</span>;
  const cls = value === 'Active' ? 'active' : value === 'Low stock' ? 'warn' : 'exited';
  return <span className={'badge ' + cls}>{value}</span>;
}

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString() : v);

export default function RewardsAdminPage() {
  const { Toast } = useCelebrate();
  const [m, setM] = useState(null);
  const [state, setState] = useState('loading');

  function load() {
    gapi.getRules().then((d) => { setM(d); setState('ready'); }).catch(() => setState('error'));
  }
  useEffect(() => { load(); }, []);

  if (state === 'error') return <div className="empty">Couldn’t load rewards admin.</div>;
  if (state === 'loading' || !m) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rewards admin 🎮</h1>
          <p className="muted">Configure how points, badges and rewards work — admins only.</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Coins issued</div><div className="kpi-value">{fmt(m.kpis.issued)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Coins redeemed</div><div className="kpi-value">{fmt(m.kpis.redeemed)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Active badges</div><div className="kpi-value">{m.kpis.activeBadges}</div></div>
        <div className="kpi-card"><div className="kpi-label">Monthly budget</div><div className="kpi-value">{m.kpis.budget}</div></div>
      </div>

      <h2 style={{ margin: '4px 0 12px' }}>Earning rules</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Event</th><th>XP</th><th>Coins</th><th>Cap</th><th>Status</th></tr></thead>
          <tbody>
            {m.earningRules.map((r) => (
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
            {m.badgeTriggers.map((b) => (
              <li key={b.name}><span>{b.emoji}</span> {b.name}<span className="g-val">{b.rule}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-head"><h2>Level thresholds</h2></div>
          <ul className="gm-goals">
            {m.levelThresholds.map((l) => (
              <li key={l.level}>Level {l.level} · {l.name}<span className="g-val">{l.xp}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <h2 style={{ margin: '20px 0 12px' }}>Reward catalog</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Reward</th><th>Cost</th><th>Stock</th><th>Redeemed</th><th>Status</th></tr></thead>
          <tbody>
            {m.rewardCatalog.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td><td>🪙 {r.cost}</td><td>{r.stock}</td><td>{r.redeemed}</td>
                <td><StatusBadge value={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Toast}
    </>
  );
}
