import { useState, useEffect } from 'react';
import './gamification.css';
import { leaderboard as demoLeaders, teamBoard as demoTeams } from './data';
import * as gapi from '../../api/gamification';

export default function LeaderboardPage({ demo }) {
  const [leaders, setLeaders] = useState(demo ? demoLeaders : null);
  const [teams, setTeams] = useState(demo ? demoTeams : null);
  const [state, setState] = useState(demo ? 'ready' : 'loading');

  useEffect(() => {
    if (demo) return;
    gapi.getLeaderboard()
      .then((d) => { setLeaders(d.leaderboard); setTeams(d.teamBoard); setState('ready'); })
      .catch(() => setState('error'));
  }, [demo]);

  if (state === 'error') return <div className="empty">Couldn’t load the leaderboard.</div>;
  if (state === 'loading' || !leaders) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leaderboard 📊</h1>
          <p className="muted">Top performers and team standings by coins earned.</p>
        </div>
      </div>

      <div className="gm-2col">
        <div className="card">
          <div className="card-head"><h2>Top performers</h2></div>
          {leaders.length === 0 ? (
            <div className="empty small">No points yet — check in and give kudos to get on the board.</div>
          ) : (
            leaders.map((p) => (
              <div className="gm-lb" key={p.rank}>
                <span className={'rk' + (p.rank <= 3 ? ' top' : '')}>{p.rank}</span>
                <span className="gm-avatar">{p.initials}</span>
                <span className="nm">{p.name}</span>
                <span className="pts">🪙 {p.coins.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-head"><h2>Team standings</h2></div>
          {(teams || []).map((t) => (
            <div className="gm-lb" key={t.rank}>
              <span className="rk top">{t.rank}</span>
              <span>{t.medal}</span>
              <span className="nm">{t.name}</span>
              <span className="pts">🪙 {typeof t.coins === 'number' ? t.coins.toLocaleString() : t.coins}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
