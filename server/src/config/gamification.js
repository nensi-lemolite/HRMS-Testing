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

// Badges + the condition that unlocks them (evaluated from profile stats).
const BADGES = [
  { key: 'PERFECT_MONTH', emoji: '🏆', name: 'Perfect Month', desc: 'No absences', trigger: '20 check-ins in a month', test: (p) => p.counters.checkins >= 20 },
  { key: 'GOAL_CRUSHER', emoji: '🎯', name: 'Goal Crusher', desc: 'All goals met', trigger: '5 goals completed', test: (p) => p.counters.goalsCompleted >= 5 },
  { key: 'CERTIFIED_PRO', emoji: '🎓', name: 'Certified Pro', desc: 'Cleared a cert', trigger: 'Any certification', test: (p) => p.counters.certs >= 1 },
  { key: 'BUG_BASHER', emoji: '🐛', name: 'Bug Basher', desc: '10 prod fixes', trigger: '10 bug fixes', test: (p) => p.counters.bugFixes >= 10 },
  { key: 'TEAM_PLAYER', emoji: '🤝', name: 'Team Player', desc: '25 kudos', trigger: '25 kudos received', test: (p) => p.counters.kudosReceived >= 25 },
  { key: 'ON_TIME', emoji: '📅', name: 'On Time', desc: 'Timesheet streak', trigger: '4 on-time timesheets', test: (p) => p.counters.timesheets >= 4 },
  { key: 'CONSISTENT', emoji: '💎', name: 'Consistent', desc: '15-day streak', trigger: '15-day check-in streak', test: (p) => p.streak >= 15 },
  { key: 'RISING_STAR', emoji: '🌟', name: 'Rising Star', desc: 'Top tier', trigger: 'Reach 1,500 XP', test: (p) => p.xp >= 1500 },
  { key: 'CONNECTOR', emoji: '🫱', name: 'Connector', desc: 'Referral hired', trigger: '1 referral hired', test: (p) => p.counters.referrals >= 1 },
  { key: 'INNOVATOR', emoji: '💡', name: 'Innovator', desc: 'Hackathon win', trigger: 'Win a hackathon', test: (p) => p.counters.hackathonWins >= 1 },
];

// Reward catalog — stock null means unlimited.
const REWARDS = [
  { key: 'AMZ500', emoji: '🎫', name: '₹500 Amazon voucher', cost: 500, stock: null },
  { key: 'WFH', emoji: '🏡', name: 'Extra WFH day', cost: 300, stock: null },
  { key: 'HALFDAY', emoji: '🌴', name: 'Half-day off', cost: 800, stock: null },
  { key: 'HOODIE', emoji: '👕', name: 'Company hoodie', cost: 400, stock: 18 },
  { key: 'PARKING', emoji: '🅿️', name: 'Reserved parking (1 mo)', cost: 350, stock: null },
  { key: 'LUNCH', emoji: '🍕', name: 'Team lunch on us', cost: 1000, stock: 5 },
];

function levelFromXp(xp) {
  let current = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  return {
    level: current.level,
    levelName: current.name,
    nextLevel: next ? next.name : null,
    xpForNext: next ? next.xp : current.xp,
  };
}

// Returns the full set of earned badge keys for a profile.
function evaluateBadges(profile) {
  const earned = new Set(profile.badges || []);
  for (const b of BADGES) {
    if (b.test(profile)) earned.add(b.key);
  }
  return [...earned];
}

module.exports = {
  EARNING,
  SELF_ACTIONS,
  EVENT_EMOJI,
  LEVELS,
  BADGES,
  REWARDS,
  levelFromXp,
  evaluateBadges,
};
