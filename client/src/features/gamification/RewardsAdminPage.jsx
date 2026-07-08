import { useState, useEffect } from 'react';
import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import * as gapi from '../../api/gamification';

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString() : v);
const cell = { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', font: 'inherit', fontSize: 13, color: 'var(--text)' };

export default function RewardsAdminPage() {
  const { celebrate, Toast } = useCelebrate();
  const [state, setState] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [earning, setEarning] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [budget, setBudget] = useState('');
  const [ref, setRef] = useState({ badges: [], levels: [], kpis: {}, catalog: [] });

  function load() {
    gapi.getRules()
      .then((d) => {
        setEarning(d.earning || []);
        setRewards(d.rewards || []);
        setBudget(d.budget || '');
        setRef({ badges: d.badges || [], levels: d.levels || [], kpis: d.kpis || {}, catalog: d.earningCatalog || [] });
        setState('ready');
      })
      .catch(() => setState('error'));
  }
  useEffect(() => { load(); }, []);

  const setE = (i, k, v) => setEarning(earning.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const removeEarning = (i) => setEarning(earning.filter((_, idx) => idx !== i));
  const addEarning = (event) => {
    const c = ref.catalog.find((x) => x.event === event);
    if (c) setEarning([...earning, { ...c }]);
  };
  const setR = (i, k, v) => setRewards(rewards.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addReward = () => setRewards([...rewards, { key: '', emoji: '🎁', name: '', cost: 0, stock: '', active: true, redeemed: 0 }]);
  const removeReward = (i) => setRewards(rewards.filter((_, idx) => idx !== i));

  async function save() {
    setSaving(true);
    try {
      await gapi.updateConfig({ earning, rewards, budget });
      celebrate('Rewards settings saved ✅');
      load();
    } catch (e) {
      celebrate(e?.response?.data?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (state === 'error') return <div className="empty">Couldn’t load rewards admin.</div>;
  if (state === 'loading') return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rewards admin 🎮</h1>
          <p className="muted">Edit how employees earn and spend points. Changes apply to everyone.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Coins issued</div><div className="kpi-value">{fmt(ref.kpis.issued)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Coins redeemed</div><div className="kpi-value">{fmt(ref.kpis.redeemed)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Active badges</div><div className="kpi-value">{ref.kpis.activeBadges}</div></div>
        <div className="kpi-card">
          <div className="kpi-label">Monthly champion budget</div>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} style={{ ...cell, width: '100%', marginTop: 4 }} placeholder="₹25,000" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 4px' }}>
        <h2 style={{ margin: 0 }}>Earning rules</h2>
        {(() => {
          const missing = ref.catalog.filter((c) => !earning.some((e) => e.event === c.event));
          return missing.length ? (
            <select value="" onChange={(e) => { if (e.target.value) addEarning(e.target.value); }} style={{ ...cell, width: 200 }}>
              <option value="">＋ Add rule…</option>
              {missing.map((c) => <option key={c.event} value={c.event}>{c.label}</option>)}
            </select>
          ) : null;
        })()}
      </div>
      <p className="muted small" style={{ margin: '0 0 12px' }}>How many points each action gives, and whether it’s on. Delete a rule to stop it awarding.</p>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Event</th><th style={{ width: 90 }}>XP</th><th style={{ width: 90 }}>Coins</th><th style={{ width: 120 }}>Cap</th><th style={{ width: 60 }}>On</th><th style={{ width: 50 }}></th></tr></thead>
          <tbody>
            {earning.length === 0 ? (
              <tr><td colSpan="6"><div className="empty small">No earning rules. Use “Add rule” to restore one.</div></td></tr>
            ) : (
              earning.map((r, i) => (
                <tr key={r.event}>
                  <td>{r.label}</td>
                  <td><input type="number" value={r.xp} onChange={(e) => setE(i, 'xp', e.target.value)} style={{ ...cell, width: 74 }} /></td>
                  <td><input type="number" value={r.coins} onChange={(e) => setE(i, 'coins', e.target.value)} style={{ ...cell, width: 74 }} /></td>
                  <td><input value={r.cap} onChange={(e) => setE(i, 'cap', e.target.value)} style={{ ...cell, width: 104 }} /></td>
                  <td><input type="checkbox" checked={r.on !== false} onChange={(e) => setE(i, 'on', e.target.checked)} /></td>
                  <td><button className="btn ghost" onClick={() => removeEarning(i)} title="Delete rule">🗑</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 4px' }}>
        <h2 style={{ margin: 0 }}>Reward catalog</h2>
        <button className="btn" onClick={addReward}>＋ Add reward</button>
      </div>
      <p className="muted small" style={{ margin: '0 0 12px' }}>Perks employees redeem coins for. Leave stock blank for unlimited.</p>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th style={{ width: 60 }}>Icon</th><th>Reward</th><th style={{ width: 100 }}>Cost</th><th style={{ width: 90 }}>Stock</th><th style={{ width: 90 }}>Redeemed</th><th style={{ width: 60 }}>Active</th><th style={{ width: 50 }}></th></tr></thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr><td colSpan="7"><div className="empty small">No rewards yet. Click “Add reward”.</div></td></tr>
            ) : (
              rewards.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.emoji} onChange={(e) => setR(i, 'emoji', e.target.value)} style={{ ...cell, width: 44, textAlign: 'center' }} /></td>
                  <td><input value={r.name} onChange={(e) => setR(i, 'name', e.target.value)} style={{ ...cell, width: '100%' }} placeholder="Company hoodie" /></td>
                  <td><input type="number" value={r.cost} onChange={(e) => setR(i, 'cost', e.target.value)} style={{ ...cell, width: 84 }} /></td>
                  <td><input type="number" value={r.stock == null ? '' : r.stock} onChange={(e) => setR(i, 'stock', e.target.value)} style={{ ...cell, width: 74 }} placeholder="∞" /></td>
                  <td className="muted">{r.redeemed || 0}</td>
                  <td><input type="checkbox" checked={r.active !== false} onChange={(e) => setR(i, 'active', e.target.checked)} /></td>
                  <td><button className="btn ghost" onClick={() => removeReward(i)} title="Remove">🗑</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="gm-2col" style={{ marginTop: 22 }}>
        <div className="card">
          <div className="card-head"><h2>Badge triggers</h2></div>
          <p className="muted small" style={{ marginTop: -6 }}>Unlock conditions (fixed).</p>
          <ul className="gm-goals">
            {ref.badges.map((b) => (
              <li key={b.name}><span>{b.emoji}</span> {b.name}<span className="g-val">{b.rule}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="card-head"><h2>Level thresholds</h2></div>
          <p className="muted small" style={{ marginTop: -6 }}>XP needed per level (fixed).</p>
          <ul className="gm-goals">
            {ref.levels.map((l) => (
              <li key={l.level}>Level {l.level} · {l.name}<span className="g-val">{l.xp}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {Toast}
    </>
  );
}
