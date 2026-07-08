// Gamification rules — the single source of truth for badges, earning rules,
// levels and the reward catalog. Per-employee progress lives in the
// GamificationProfile model; this file defines *what* can be earned.

// Earning rules: action type -> reward + which counter it bumps.
// The 5 editable rules below all fire automatically; KUDOS_GIVEN is internal.
const EARNING = {
  CHECKIN:     { label: 'Daily check-in',        xp: 10,  coins: 2,   counter: 'checkins',       cap: '1 / day' },
  KUDOS:       { label: 'Peer kudos received',   xp: 5,   coins: 2,   counter: 'kudosReceived',  cap: '20 / month' },
  GOAL:        { label: 'Goal / OKR completed',  xp: 50,  coins: 20,  counter: 'goalsCompleted', cap: '—' },
  CERT:        { label: 'Certification cleared',  xp: 100, coins: 50,  counter: 'certs',          cap: '—' },
  REFERRAL:    { label: 'Referral hired',         xp: 200, coins: 100, counter: 'referrals',      cap: '—' },
  KUDOS_GIVEN: { label: 'Gave kudos',            xp: 5,   coins: 0,   counter: 'kudosGiven',     cap: '—' },
};

// Actions an employee/admin can self-trigger via the award endpoint.
const SELF_ACTIONS = ['CHECKIN', 'GOAL', 'CERT'];

// Emoji shown against a recent-win event.
const EVENT_EMOJI = {
  CHECKIN: '✅', GOAL: '🎯', CERT: '🎓', KUDOS: '🤝', KUDOS_GIVEN: '🤝', REFERRAL: '🫱',
};

// Levels — highest threshold <= xp wins (5 ranks).
const LEVELS = [
  { level: 1, name: 'Rookie', xp: 0 },
  { level: 2, name: 'Contributor', xp: 300 },
  { level: 3, name: 'Builder', xp: 800 },
  { level: 4, name: 'Code Ninja', xp: 1500 },
  { level: 5, name: 'Grandmaster', xp: 3000 },
];

// Human labels for the stats a badge can be based on (also drives the admin dropdown).
const STAT_LABELS = {
  checkins: 'check-ins',
  timesheets: 'on-time timesheets',
  goalsCompleted: 'goals completed',
  certs: 'certifications',
  kudosReceived: 'kudos received',
  bugFixes: 'bug fixes',
  referrals: 'referrals hired',
  hackathonWins: 'hackathon wins',
  streak: 'day check-in streak',
  xp: 'XP',
  coins: 'coins',
};

// Badges are data-driven: a badge unlocks when `stat` reaches `threshold`.
// 5 badges, each tied to one of the automatic earning sources.
const BADGES = [
  { key: 'CONSISTENT', emoji: '💎', name: 'Consistent', desc: '15-day streak', stat: 'streak', threshold: 15 },
  { key: 'TEAM_PLAYER', emoji: '🤝', name: 'Team Player', desc: '25 kudos', stat: 'kudosReceived', threshold: 25 },
  { key: 'GOAL_CRUSHER', emoji: '🎯', name: 'Goal Crusher', desc: 'All goals met', stat: 'goalsCompleted', threshold: 5 },
  { key: 'CERTIFIED_PRO', emoji: '🎓', name: 'Certified Pro', desc: 'Cleared a cert', stat: 'certs', threshold: 1 },
  { key: 'CONNECTOR', emoji: '🫱', name: 'Connector', desc: 'Referral hired', stat: 'referrals', threshold: 1 },
];

// The current value of a stat on a profile.
function statValue(profile, stat) {
  if (stat === 'xp') return profile.xp || 0;
  if (stat === 'coins') return profile.coins || 0;
  if (stat === 'streak') return profile.streak || 0;
  return (profile.counters && profile.counters[stat]) || 0;
}

// A readable "trigger" line for a badge def.
function badgeRule(b) {
  if (b.stat === 'certs' && Number(b.threshold) === 1) return 'Any certification';
  return `${Number(b.threshold).toLocaleString()} ${STAT_LABELS[b.stat] || b.stat}`;
}

// Reward catalog — stock null means unlimited (5 rewards).
const REWARDS = [
  { key: 'AMZ500', emoji: '🎫', name: '₹500 Amazon voucher', cost: 500, stock: null },
  { key: 'WFH', emoji: '🏡', name: 'Extra WFH day', cost: 300, stock: null },
  { key: 'HALFDAY', emoji: '🌴', name: 'Half-day off', cost: 800, stock: null },
  { key: 'HOODIE', emoji: '👕', name: 'Company hoodie', cost: 400, stock: 18 },
  { key: 'LUNCH', emoji: '🍕', name: 'Team lunch on us', cost: 1000, stock: 5 },
];

function levelFromXp(xp, levelDefs) {
  const src = (levelDefs && levelDefs.length ? levelDefs : LEVELS).slice().sort((a, b) => a.xp - b.xp);
  let current = src[0];
  let next = null;
  for (let i = 0; i < src.length; i++) {
    if (xp >= src[i].xp) { current = src[i]; next = src[i + 1] || null; }
  }
  return {
    level: current.level,
    levelName: current.name,
    nextLevel: next ? next.name : null,
    xpForNext: next ? next.xp : current.xp,
  };
}

// Returns the full set of earned badge keys for a profile, given the badge defs.
function evaluateBadges(profile, badgeDefs) {
  const defs = badgeDefs && badgeDefs.length ? badgeDefs : BADGES;
  const earned = new Set(profile.badges || []);
  for (const b of defs) {
    if (b.enabled !== false && statValue(profile, b.stat) >= (Number(b.threshold) || 0)) earned.add(b.key);
  }
  return [...earned];
}

// Editable defaults used to seed a company's GamificationConfig document.
function defaultEarning() {
  return Object.entries(EARNING)
    .filter(([k]) => k !== 'KUDOS_GIVEN')
    .map(([event, r]) => ({ event, label: r.label, xp: r.xp, coins: r.coins, cap: r.cap, on: !r.off }));
}
function defaultRewards() {
  return REWARDS.map((r) => ({ key: r.key, emoji: r.emoji, name: r.name, cost: r.cost, stock: r.stock, active: true }));
}
function defaultBadges() {
  return BADGES.map((b) => ({ ...b, enabled: true }));
}
function defaultLevels() {
  return LEVELS.map((l) => ({ ...l }));
}

module.exports = {
  EARNING,
  SELF_ACTIONS,
  EVENT_EMOJI,
  LEVELS,
  BADGES,
  REWARDS,
  STAT_LABELS,
  levelFromXp,
  evaluateBadges,
  badgeRule,
  defaultEarning,
  defaultRewards,
  defaultBadges,
  defaultLevels,
};
