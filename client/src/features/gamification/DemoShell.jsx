import { useState } from 'react';
import './gamification.css';
import MySpacePage from './MySpacePage';
import AchievementsPage from './AchievementsPage';
import LeaderboardPage from './LeaderboardPage';
import RewardsStorePage from './RewardsStorePage';
import RewardsAdminPage from './RewardsAdminPage';
import ProjectsPage from '../projects/ProjectsPage';
import OffboardingPage from '../exit/OffboardingPage';

const TABS = [
  { id: 'me', label: '🏠 My space', El: MySpacePage },
  { id: 'ach', label: '🏆 Achievements', El: AchievementsPage },
  { id: 'lb', label: '📊 Leaderboard', El: LeaderboardPage },
  { id: 'store', label: '🎁 Rewards store', El: RewardsStorePage },
  { id: 'admin', label: '🎮 Rewards admin', El: RewardsAdminPage },
  { id: 'proj', label: '🧩 Projects', El: ProjectsPage },
  { id: 'exit', label: '↩ Offboarding', El: OffboardingPage },
];

export default function DemoShell() {
  const [tab, setTab] = useState('me');
  const Active = (TABS.find((t) => t.id === tab) || TABS[0]).El;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          background: 'var(--gradient)', color: '#fff',
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>H</div>
        <strong>HRMS India</strong>
        <span style={{ opacity: 0.85, fontSize: 13 }}>— feature demo (dummy data)</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, background: 'rgba(255,255,255,.18)', padding: '5px 12px', borderRadius: 999 }}>🇮🇳 India · INR</span>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 24px 0', maxWidth: 1120, margin: '0 auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={'btn' + (tab === t.id ? ' primary' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="main" style={{ maxWidth: 1120, margin: '0 auto' }}>
        <Active demo />
      </main>
    </div>
  );
}
