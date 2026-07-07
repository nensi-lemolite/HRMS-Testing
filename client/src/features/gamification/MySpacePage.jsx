import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import { me as demoMe, weeklyGoals as demoGoals, recentWins as demoWins, colleagues as demoColleagues } from './data';
import * as gapi from '../../api/gamification';

function demoModel() {
  return {
    name: demoMe.name, level: demoMe.level, levelName: demoMe.levelName, nextLevel: demoMe.nextLevel,
    xp: demoMe.xp, xpForNext: demoMe.xpForNext, coins: demoMe.coins, streak: demoMe.streak,
    badgesEarned: demoMe.badgesEarned, weeklyGoals: demoGoals, recentWins: demoWins,
  };
}

export default function MySpacePage({ demo }) {
  const { celebrate, Toast } = useCelebrate();
  const [model, setModel] = useState(demo ? demoModel() : null);
  const [state, setState] = useState(demo ? 'ready' : 'loading');
  const [kudos, setKudos] = useState(null); // { list, sel } while the picker is open

  useEffect(() => {
    if (demo) return;
    gapi.getMe()
      .then((d) => {
        if (!d.hasProfile) { setState('no-profile'); return; }
        setModel(d); setState('ready');
      })
      .catch(() => setState('error'));
  }, [demo]);

  async function doCheckin() {
    if (demo) return celebrate('Checked in! +10 XP 🎯');
    try {
      const d = await gapi.checkin();
      setModel(d);
      celebrate(d.awarded ? `Checked in! +${d.awarded.xp} XP 🎯` : 'Already checked in today ✅');
    } catch { celebrate('Check-in failed'); }
  }
  async function openKudos() {
    if (demo) {
      return setKudos({ list: demoColleagues, sel: demoColleagues[0].id });
    }
    try {
      const d = await gapi.getColleagues();
      if (!d.colleagues.length) return celebrate('No colleagues to recognize yet');
      setKudos({ list: d.colleagues, sel: d.colleagues[0].id });
    } catch { celebrate('Could not load colleagues'); }
  }
  async function sendKudos() {
    const { list, sel } = kudos;
    const name = list.find((c) => c.id === sel)?.name;
    setKudos(null);
    if (demo) return celebrate(`Kudos sent to ${name}! +5 XP 🤝`);
    try {
      const d = await gapi.giveKudos(sel);
      setModel(d);
      celebrate(`Kudos sent to ${d.to || name}! +${d.awarded.xp} XP 🤝`);
    } catch { celebrate('Could not send kudos'); }
  }

  if (state === 'no-profile')
    return (
      <div className="page-header"><div>
        <h1>My space</h1>
        <p className="muted">Gamification is for employee accounts — your admin login isn’t linked to an employee profile.</p>
      </div></div>
    );
  if (state === 'error') return <div className="empty">Couldn’t load your space. Try again.</div>;
  if (state === 'loading' || !model) return <div className="empty">Loading…</div>;

  const pct = Math.min(100, Math.round((model.xp / (model.xpForNext || model.xp || 1)) * 100));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Hey {model.name.split(' ')[0]} 👋</h1>
          <p className="muted">You're on a {model.streak}-day check-in streak — keep it going!</p>
        </div>
      </div>

      <div className="gm-hero">
        <div className="gm-levelcard">
          <div className="lv">LEVEL {model.level} · {String(model.levelName).toUpperCase()}</div>
          <div className="big">{model.xp.toLocaleString()} XP</div>
          <div className="gm-levelbar"><i style={{ width: pct + '%' }} /></div>
          <div className="sub">
            {model.nextLevel
              ? `${Math.max(0, model.xpForNext - model.xp).toLocaleString()} XP to Level ${model.level + 1} · ${model.nextLevel}`
              : 'Max level reached 🏆'}
          </div>
        </div>
        <div className="gm-stat"><div className="em">🪙</div><div className="v">{model.coins.toLocaleString()}</div><div className="l">Coins to spend</div></div>
        <div className="gm-stat"><div className="em">🔥</div><div className="v">{model.streak}</div><div className="l">Day streak</div></div>
        <div className="gm-stat"><div className="em">🏅</div><div className="v">{model.badgesEarned}</div><div className="l">Badges earned</div></div>
      </div>

      <div className="gm-2col">
        <div className="card">
          <div className="card-head"><h2>Quick actions</h2></div>
          <div className="gm-actions">
            <button className="btn primary" onClick={doCheckin}>✓ Check in</button>
            <Link className="btn" to="/leave">🌴 Apply leave</Link>
            <Link className="btn" to="/payroll">🧾 My payslip</Link>
            <Link className="btn" to="/rewards">🎁 Redeem coins</Link>
            <button className="btn" onClick={openKudos}>🤝 Give kudos</button>
          </div>

          <div className="card-head" style={{ marginTop: 22 }}><h2>This week’s goals</h2></div>
          <ul className="gm-goals">
            {model.weeklyGoals.map((g) => (
              <li key={g.label}>
                <span>{g.icon}</span> {g.label}
                <span className={'g-val' + (g.done ? ' done' : '')}>{g.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-head"><h2>Recent wins 🎉</h2></div>
          {model.recentWins.length === 0 ? (
            <div className="empty small">Earn XP by checking in, giving kudos, and hitting goals.</div>
          ) : (
            <ul className="gm-wins">
              {model.recentWins.map((w, i) => (
                <li key={i}><span>{w.icon}</span> {w.label}<span className="w-pts">+{w.pts}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {kudos && (
        <div className="modal-backdrop" onClick={() => setKudos(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon info">🤝</div>
            <h2 style={{ marginBottom: 6 }}>Give kudos</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>Recognize a colleague — they earn +5 XP.</p>
            <div className="form">
              <label>
                Colleague
                <select value={kudos.sel} onChange={(e) => setKudos({ ...kudos, sel: e.target.value })}>
                  {kudos.list.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.department ? ` · ${c.department}` : ''}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn" onClick={() => setKudos(null)}>Cancel</button>
              <button className="btn primary" onClick={sendKudos}>Send kudos</button>
            </div>
          </div>
        </div>
      )}

      {Toast}
    </>
  );
}
