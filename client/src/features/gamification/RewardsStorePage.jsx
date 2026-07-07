import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import { me, rewards } from './data';

export default function RewardsStorePage() {
  const { celebrate, Toast } = useCelebrate();
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rewards store 🎁</h1>
          <p className="muted">You have <b style={{ color: 'var(--warning)' }}>🪙 {me.coins.toLocaleString()} coins</b>. Redeem them for real perks.</p>
        </div>
      </div>

      <div className="gm-rewardgrid">
        {rewards.map((r) => (
          <div className="gm-reward" key={r.name}>
            <div className="em">{r.emoji}</div>
            <div className="nm">{r.name}</div>
            <div className="cost">🪙 {r.cost}</div>
            <button
              className="btn gm-gold"
              disabled={me.coins < r.cost}
              onClick={() => celebrate('Redeemed: ' + r.name + ' — enjoy!')}
            >
              Redeem
            </button>
          </div>
        ))}
      </div>

      {Toast}
    </>
  );
}
