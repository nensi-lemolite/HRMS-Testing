import { Link } from 'react-router-dom';
import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import { me, weeklyGoals, recentWins } from './data';

export default function MySpacePage() {
  const { celebrate, Toast } = useCelebrate();
  const pct = Math.round((me.xp / me.xpForNext) * 100);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Hey {me.name.split(' ')[0]} 👋</h1>
          <p className="muted">
            You're on a {me.streak}-day check-in streak — {15 - me.streak} more days to unlock the “Consistent” badge!
          </p>
        </div>
      </div>

      <div className="gm-hero">
        <div className="gm-levelcard">
          <div className="lv">LEVEL {me.level} · {me.levelName.toUpperCase()}</div>
          <div className="big">{me.xp.toLocaleString()} XP</div>
          <div className="gm-levelbar"><i style={{ width: pct + '%' }} /></div>
          <div className="sub">{(me.xpForNext - me.xp).toLocaleString()} XP to Level {me.level + 1} · {me.nextLevel}</div>
        </div>
        <div className="gm-stat"><div className="em">🪙</div><div className="v">{me.coins.toLocaleString()}</div><div className="l">Coins to spend</div></div>
        <div className="gm-stat"><div className="em">🔥</div><div className="v">{me.streak}</div><div className="l">Day streak</div></div>
        <div className="gm-stat"><div className="em">🏅</div><div className="v">{me.badgesEarned}</div><div className="l">Badges earned</div></div>
      </div>

      <div className="gm-2col">
        <div className="card">
          <div className="card-head"><h2>Quick actions</h2></div>
          <div className="gm-actions">
            <button className="btn primary" onClick={() => celebrate('Checked in! +10 XP 🎯')}>✓ Check in</button>
            <Link className="btn" to="/leave">🌴 Apply leave</Link>
            <Link className="btn" to="/payroll">🧾 My payslip</Link>
            <Link className="btn" to="/rewards">🎁 Redeem coins</Link>
            <button className="btn" onClick={() => celebrate('Kudos sent to Vikram! +5 XP 🤝')}>🤝 Give kudos</button>
          </div>

          <div className="card-head" style={{ marginTop: 22 }}><h2>This week’s goals</h2></div>
          <ul className="gm-goals">
            {weeklyGoals.map((g) => (
              <li key={g.label}>
                <span>{g.icon}</span> {g.label}
                <span className={'g-val' + (g.done ? ' done' : '')}>{g.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-head"><h2>Recent wins 🎉</h2></div>
          <ul className="gm-wins">
            {recentWins.map((w) => (
              <li key={w.label}><span>{w.icon}</span> {w.label}<span className="w-pts">+{w.pts}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {Toast}
    </>
  );
}
