import './gamification.css';
import { leaderboard, teamBoard } from './data';

export default function LeaderboardPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leaderboard 📊</h1>
          <p className="muted">This month · top performers and team standings.</p>
        </div>
      </div>

      <div className="gm-2col">
        <div className="card">
          <div className="card-head"><h2>Top performers</h2></div>
          {leaderboard.map((p) => (
            <div className="gm-lb" key={p.rank}>
              <span className={'rk' + (p.rank <= 3 ? ' top' : '')}>{p.rank}</span>
              <span className="gm-avatar">{p.initials}</span>
              <span className="nm">{p.name}</span>
              <span className="pts">🪙 {p.coins.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><h2>Team standings</h2></div>
          {teamBoard.map((t) => (
            <div className="gm-lb" key={t.rank}>
              <span className="rk top">{t.rank}</span>
              <span>{t.medal}</span>
              <span className="nm">{t.name}</span>
              <span className="pts">🪙 {t.coins}</span>
            </div>
          ))}
          <div className="list" style={{ marginTop: 14 }}>
            <li>
              <span className="gm-avatar">🏆</span>
              <div className="list-meta">
                <div className="list-title">Monthly champion</div>
                <div className="list-sub">Vikram wins a ₹2,000 voucher + reserved parking!</div>
              </div>
            </li>
          </div>
        </div>
      </div>
    </>
  );
}
