import './gamification.css';
import { me, badges } from './data';

export default function AchievementsPage() {
  const pct = Math.round((me.xp / me.xpForNext) * 100);
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Achievements 🏆</h1>
          <p className="muted">Earn XP and badges for great work — level up and unlock perks.</p>
        </div>
      </div>

      <div className="gm-hero">
        <div className="gm-levelcard">
          <div className="lv">LEVEL {me.level} · {me.levelName.toUpperCase()}</div>
          <div className="big">{me.xp.toLocaleString()} XP</div>
          <div className="gm-levelbar"><i style={{ width: pct + '%' }} /></div>
          <div className="sub">{(me.xpForNext - me.xp).toLocaleString()} XP to Level {me.level + 1} · {me.nextLevel}</div>
        </div>
        <div className="gm-stat"><div className="em">🔥</div><div className="v">{me.streak}</div><div className="l">Day streak</div></div>
        <div className="gm-stat"><div className="em">🏅</div><div className="v">{me.badgesEarned}/{me.badgesTotal}</div><div className="l">Badges</div></div>
      </div>

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
