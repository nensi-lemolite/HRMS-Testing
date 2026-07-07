// Dummy data for the gamification + IT-lifecycle demo modules.
// Pure front-end mock — no API needed, so these pages render standalone.

export const me = {
  name: 'Ananya Rao',
  initials: 'AR',
  title: 'Senior Engineer',
  dept: 'Engineering',
  level: 7,
  levelName: 'Code Ninja',
  nextLevel: 'Tech Samurai',
  xp: 1240,
  xpForNext: 2000,
  coins: 1240,
  streak: 12,
  badgesEarned: 9,
  badgesTotal: 16,
};

export const weeklyGoals = [
  { icon: '🎯', label: 'Close 5 code reviews', value: '3 / 5', done: false },
  { icon: '📅', label: 'Submit timesheet on time', value: 'Done', done: true },
  { icon: '🎓', label: 'Finish “Advanced MongoDB”', value: '40%', done: false },
];

export const recentWins = [
  { icon: '🏆', label: 'Perfect attendance — June', pts: 50 },
  { icon: '🤝', label: '5 kudos received', pts: 25 },
  { icon: '🎓', label: 'Cleared AWS SAA cert', pts: 100 },
  { icon: '🐛', label: 'Fixed critical prod bug', pts: 40 },
];

export const badges = [
  { emoji: '🏆', name: 'Perfect Month', desc: 'No absences', earned: true },
  { emoji: '🎯', name: 'Goal Crusher', desc: 'All goals met', earned: true },
  { emoji: '🎓', name: 'Certified Pro', desc: 'Cleared AWS', earned: true },
  { emoji: '🐛', name: 'Bug Basher', desc: '10 prod fixes', earned: true },
  { emoji: '🤝', name: 'Team Player', desc: '25 kudos', earned: true },
  { emoji: '📅', name: 'On Time', desc: 'Timesheet streak', earned: true },
  { emoji: '🚀', name: 'Ship It', desc: '5 releases', earned: true },
  { emoji: '🌟', name: 'Rising Star', desc: 'Top quarter', earned: true },
  { emoji: '🧑‍🏫', name: 'Mentor', desc: 'Onboard 3', earned: true },
  { emoji: '💎', name: 'Consistent', desc: '15-day streak', earned: false },
  { emoji: '🏅', name: '5-Year Club', desc: 'Locked', earned: false },
  { emoji: '💡', name: 'Innovator', desc: 'Hackathon win', earned: false },
];

export const leaderboard = [
  { rank: 1, initials: 'VT', name: 'Vikram Thomas', coins: 2180 },
  { rank: 2, initials: 'PM', name: 'Priya Menon', coins: 1910 },
  { rank: 3, initials: 'AR', name: 'Ananya Rao', coins: 1240 },
  { rank: 4, initials: 'DN', name: 'Divya Nair', coins: 1120 },
  { rank: 5, initials: 'SN', name: 'Sana N.', coins: 980 },
];

export const teamBoard = [
  { rank: 1, medal: '🥇', name: 'Platform team', coins: '8.4k' },
  { rank: 2, medal: '🥈', name: 'Product team', coins: '7.1k' },
  { rank: 3, medal: '🥉', name: 'Mobile team', coins: '6.3k' },
];

export const rewards = [
  { emoji: '🎫', name: '₹500 Amazon voucher', cost: 500 },
  { emoji: '🏡', name: 'Extra WFH day', cost: 300 },
  { emoji: '🌴', name: 'Half-day off', cost: 800 },
  { emoji: '👕', name: 'Company hoodie', cost: 400 },
  { emoji: '🅿️', name: 'Reserved parking (1 mo)', cost: 350 },
  { emoji: '🍕', name: 'Team lunch on us', cost: 1000 },
];

export const earningRules = [
  { event: 'Daily check-in', xp: 10, coins: 2, cap: '1 / day', on: true },
  { event: 'Timesheet submitted on time', xp: 15, coins: 5, cap: '1 / week', on: true },
  { event: 'Goal / OKR completed', xp: 50, coins: 20, cap: '—', on: true },
  { event: 'Certification cleared', xp: 100, coins: 50, cap: '—', on: true },
  { event: 'Peer kudos received', xp: 5, coins: 2, cap: '20 / month', on: true },
  { event: 'Perfect attendance (month)', xp: 50, coins: 25, cap: '1 / month', on: true },
  { event: 'Referral hired', xp: 200, coins: 100, cap: '—', on: true },
  { event: 'Hackathon win', xp: 500, coins: 250, cap: '—', on: false },
];

export const badgeTriggers = [
  { emoji: '🏆', name: 'Perfect Month', rule: '0 absences in a month' },
  { emoji: '🎓', name: 'Certified Pro', rule: 'Any verified certification' },
  { emoji: '🤝', name: 'Team Player', rule: '25 kudos received' },
  { emoji: '💎', name: 'Consistent', rule: '15-day check-in streak' },
  { emoji: '💡', name: 'Innovator', rule: 'Win a hackathon' },
];

export const levelThresholds = [
  { level: 6, name: 'Code Adept', xp: '1,000 XP' },
  { level: 7, name: 'Code Ninja', xp: '1,500 XP' },
  { level: 8, name: 'Tech Samurai', xp: '2,000 XP' },
  { level: 9, name: 'Grandmaster', xp: '3,000 XP' },
];

export const rewardCatalog = [
  { name: '🎫 ₹500 Amazon voucher', cost: 500, stock: '∞', redeemed: 22, status: 'Active' },
  { name: '🏡 Extra WFH day', cost: 300, stock: '∞', redeemed: 41, status: 'Active' },
  { name: '👕 Company hoodie', cost: 400, stock: 18, redeemed: 12, status: 'Active' },
  { name: '🍕 Team lunch', cost: 1000, stock: 5, redeemed: 3, status: 'Low stock' },
];

// --- Projects & bench (IT) ---
export const projects = [
  { name: 'Payroll revamp', client: 'Acme Corp', team: 6, stack: 'Node · React', alloc: '100%', status: 'On track' },
  { name: 'Mobile banking app', client: 'FinOne', team: 9, stack: 'Flutter · Go', alloc: '90%', status: 'At risk' },
  { name: 'Data platform', client: 'Internal', team: 4, stack: 'Python · Spark', alloc: '75%', status: 'On track' },
];

export const bench = [
  { initials: 'SN', name: 'Sana N.', skills: 'Node, GCP, K8s', since: '3 days', avail: 'Immediate' },
  { initials: 'RM', name: 'Ravi M.', skills: 'React, TypeScript', since: '11 days', avail: 'Immediate' },
];

// --- Offboarding + full & final settlement ---
export const offboarding = {
  name: 'Sameer Khan',
  meta: 'Resigned 20 Jun 2026 · Last working day 19 Jul 2026 · Notice 30 days (served) · 6.1 yrs of service',
  checklist: [
    { label: 'Resignation approved by manager', state: 'done' },
    { label: 'Knowledge transfer & handover', state: 'done' },
    { label: 'Exit interview', state: 'done' },
    { label: 'Finance / advances cleared', state: 'done' },
    { label: 'ID card & access badge returned', state: 'done' },
    { label: 'IT assets returned (ThinkPad #A118)', state: 'now' },
    { label: 'System access revocation (email, VPN)', state: 'todo' },
  ],
  payables: [
    { label: 'Salary · 19 days of July', amount: '₹49,032' },
    { label: 'Leave encashment · 14 EL', amount: '₹21,538' },
    { label: 'Gratuity · 6 yrs (15/26 × basic)', amount: '₹1,38,462' },
  ],
  payableTotal: '₹2,09,032',
  deductions: [
    { label: 'Loan / advance recovery', amount: '₹5,000' },
    { label: 'TDS on settlement', amount: '₹8,000' },
    { label: 'Notice shortfall', amount: '—' },
  ],
  deductionTotal: '₹13,000',
  net: '₹1,96,032',
};
