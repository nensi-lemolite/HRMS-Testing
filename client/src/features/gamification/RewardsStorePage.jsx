import { useState, useEffect } from 'react';
import './gamification.css';
import { useCelebrate } from './celebrate.jsx';
import * as gapi from '../../api/gamification';

export default function RewardsStorePage() {
  const { celebrate, Toast } = useCelebrate();
  const [coins, setCoins] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [state, setState] = useState('loading');

  function load() {
    gapi.getRewards()
      .then((d) => { setCoins(d.coins); setRewards(d.rewards); setState('ready'); })
      .catch(() => setState('error'));
  }
  useEffect(() => { load(); }, []);

  async function doRedeem(r) {
    try {
      const d = await gapi.redeemReward(r.key);
      setCoins(d.coins);
      celebrate('Redeemed: ' + d.redeemed + ' — enjoy!');
      load();
    } catch (e) {
      celebrate(e?.response?.data?.error || 'Could not redeem');
    }
  }

  if (state === 'error') return <div className="empty">Couldn’t load the rewards store.</div>;
  if (state === 'loading' || !rewards) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Rewards store 🎁</h1>
          <p className="muted">
            You have <b style={{ color: 'var(--warning)' }}>🪙 {Number(coins).toLocaleString()} coins</b>. Redeem them for real perks.
          </p>
        </div>
      </div>

      <div className="gm-rewardgrid">
        {rewards.map((r) => (
          <div className="gm-reward" key={r.key}>
            <div className="em">{r.emoji}</div>
            <div className="nm">{r.name}</div>
            <div className="cost">🪙 {r.cost}{r.stock !== undefined && r.stock !== '∞' ? ` · ${r.stock} left` : ''}</div>
            <button
              className="btn gm-gold"
              disabled={r.affordable === false || r.soldOut}
              onClick={() => doRedeem(r)}
            >
              {r.soldOut ? 'Sold out' : 'Redeem'}
            </button>
          </div>
        ))}
      </div>

      {Toast}
    </>
  );
}
