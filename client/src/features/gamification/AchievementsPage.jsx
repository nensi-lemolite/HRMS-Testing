import { useState, useEffect } from 'react';
import './gamification.css';
import { me as demoMe, badges as demoBadges } from './data';
import * as gapi from '../../api/gamification';

export default function AchievementsPage({ demo }) {
  const [level, setLevel] = useState(demo ? demoMe : null);
  const [badges, setBadges] = useState(demo ? demoBadges : null);
  const [state, setState] = useState(demo ? 'ready' : 'loading');

  useEffect(() => {
    if (demo) return;
    Promise.all([gapi.getMe(), gapi.getBadges()])
      .then(([m, b]) => {
        setLevel(m.hasProfile ? m : null);
        setBadges(b.badges);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [demo]);

  if (state === 'error') return <div className="empty">Couldn’t load achievements.</div>;
  if (state === 'loading' || !badges) return <div className="empty">Loading…</div>;

  const pct = level ? Math.min(100, Math.round((level.xp / (level.xpForNext || level.xp || 1)) * 100)) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Achievements 🏆</h1>
          <p className="muted">Earn XP and badges for great work — level up and unlock perks.</p>
        </div>
      </div>

      {level && (
        <div className="gm-hero">
          <div className="gm-levelcard">
            <div className="lv">LEVEL {level.level} · {String(level.levelName).toUpperCase()}</div>
            <div className="big">{level.xp.toLocaleString()} XP</div>
            <div className="gm-levelbar"><i style={{ width: pct + '%' }} /></div>
            <div className="sub">
              {level.nextLevel
                ? `${Math.max(0, level.xpForNext - level.xp).toLocaleString()} XP to Level ${level.level + 1} · ${level.nextLevel}`
                : 'Max level reached 🏆'}
            </div>
          </div>
          <div className="gm-stat"><div className="em">🔥</div><div className="v">{level.streak}</div><div className="l">Day streak</div></div>
          <div className="gm-stat"><div className="em">🏅</div><div className="v">{level.badgesEarned}/{level.badgesTotal}</div><div className="l">Badges</div></div>
        </div>
      )}

      <h2 style={{ margin: '4px 0 12px' }}>Badges</h2>
      <div className="gm-badgegrid">
        {badges.map((b) => (
          <div key={b.name} className={'gm-badge' + (b.earned ? '' : ' locked')}>
            <div className="em">{b.emoji}</div>
            <div className="nm">{b.name}</div>
            <div className="ds">{b.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
