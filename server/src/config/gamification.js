// Gamification rules — the single source of truth for badges, earning rules,
// levels and the reward catalog. Per-employee progress lives in the
// GamificationProfile model; this file defines *what* can be earned.

// Earning rules: action type -> reward + which counter it bumps.
const EARNING = {
  CHECKIN:     { label: 'Daily check-in',                xp: 10,  coins: 2,   counter: 'checkins',       cap: '1 / day' },
  TIMESHEET:   { label: 'Timesheet submitted on time',   xp: 15,  coins: 5,   counter: 'timesheets',     cap: '1 / week' },
  GOAL:        { label: 'Goal / OKR completed',          xp: 50,  coins: 20,  counter: 'goalsCompleted', cap: '—' },
  CERT:        { label: 'Certification cleared',          xp: 100, coins: 50,  counter: 'certs',          cap: '—' },
  KUDOS:       { label: 'Peer kudos received',            xp: 5,   coins: 2,   counter: 'kudosReceived',  cap: '20 / month' },
  KUDOS_GIVEN: { label: 'Gave kudos',                     xp: 5,   coins: 0,   counter: 'kudosGiven',     cap: '—' },
  PERFECT_ATT: { label: 'Perfect attendance (month)',     xp: 50,  coins: 25,  counter: 'perfectMonths',  cap: '1 / month' },
  REFERRAL:    { label: 'Referral hired',                 xp: 200, coins: 100, counter: 'referrals',      cap: '—' },
  BUGFIX:      { label: 'Critical bug fixed',             xp: 40,  coins: 10,  counter: 'bugFixes',       cap: '—' },
  HACKATHON:   { label: 'Hackathon win',                  xp: 500, coins: 250, counter: 'hackathonWins',  cap: '—', off: true },
};

// Actions an employee can self-trigger from the UI (safe to award on demand).
const SELF_ACTIONS = ['CHECKIN', 'TIMESHEET', 'GOAL', 'CERT', 'BUGFIX'];

// Emoji shown against a recent-win event.
const EVENT_EMOJI = {
  CHECKIN: '✅', TIMESHEET: '📅', GOAL: '🎯', CERT: '🎓', KUDOS: '🤝',
  KUDOS_GIVEN: '🤝', PERFECT_ATT: '🏆', REFERRAL: '🫱', BUGFIX: '🐛', HACKATHON: '💡',
};

// Levels — highest threshold <= xp wins.
const LEVELS = [
  { level: 1, name: 'Rookie', xp: 0 },
  { level: 2, name: 'Junior', xp: 150 },
  { level: 3, name: 'Contributor', xp: 350 },
  { level: 4, name: 'Builder', xp: 600 },
  { level: 5, name: 'Craftsman', xp: 800 },
  { level: 6, name: 'Code Adept', xp: 1000 },
  { level: 7, name: 'Code Ninja', xp: 1500 },
  { level: 8, name: 'Tech Samurai', xp: 2000 },
  { level: 9, name: 'Grandmaster', xp: 3000 },
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
const BADGES = [
  { key: 'PERFECT_MONTH', emoji: '🏆', name: 'Perfect Month', desc: 'No absences', stat: 'checkins', threshold: 20 },
  { key: 'GOAL_CRUSHER', emoji: '🎯', name: 'Goal Crusher', desc: 'All goals met', stat: 'goalsCompleted', threshold: 5 },
  { key: 'CERTIFIED_PRO', emoji: '🎓', name: 'Certified Pro', desc: 'Cleared a cert', stat: 'certs', threshold: 1 },
  { key: 'BUG_BASHER', emoji: '🐛', name: 'Bug Basher', desc: '10 prod fixes', stat: 'bugFixes', threshold: 10 },
  { key: 'TEAM_PLAYER', emoji: '🤝', name: 'Team Player', desc: '25 kudos', stat: 'kudosReceived', threshold: 25 },
  { key: 'ON_TIME', emoji: '📅', name: 'On Time', desc: 'Timesheet streak', stat: 'timesheets', threshold: 4 },
  { key: 'CONSISTENT', emoji: '💎', name: 'Consistent', desc: '15-day streak', stat: 'streak', threshold: 15 },
  { key: 'RISING_STAR', emoji: '🌟', name: 'Rising Star', desc: 'Top tier', stat: 'xp', threshold: 1500 },
  { key: 'CONNECTOR', emoji: '🫱', name: 'Connector', desc: 'Referral hired', stat: 'referrals', threshold: 1 },
  { key: 'INNOVATOR', emoji: '💡', name: 'Innovator', desc: 'Hackathon win', stat: 'hackathonWins', threshold: 1 },
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

// Reward catalog — stock null means unlimited.
const REWARDS = [
  { key: 'AMZ500', emoji: '🎫', name: '₹500 Amazon voucher', cost: 500, stock: null },
  { key: 'WFH', emoji: '🏡', name: 'Extra WFH day', cost: 300, stock: null },
  { key: 'HALFDAY', emoji: '🌴', name: 'Half-day off', cost: 800, stock: null },
  { key: 'HOODIE', emoji: '👕', name: 'Company hoodie', cost: 400, stock: 18 },
  { key: 'PARKING', emoji: '🅿️', name: 'Reserved parking (1 mo)', cost: 350, stock: null },
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
