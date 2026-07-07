const asyncHandler = require('express-async-handler');
const GamificationProfile = require('../../models/GamificationProfile');
const Redemption = require('../../models/Redemption');
const Employee = require('../../models/Employee');
const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');
const {
  EARNING,
  SELF_ACTIONS,
  EVENT_EMOJI,
  LEVELS,
  BADGES,
  REWARDS,
  levelFromXp,
  evaluateBadges,
} = require('../../config/gamification');

const WEEKLY_GOALS = [
  { icon: '🎯', label: 'Close 5 code reviews', value: '3 / 5', done: false },
  { icon: '📅', label: 'Submit timesheet on time', value: 'Done', done: true },
  { icon: '🎓', label: 'Finish “Advanced MongoDB”', value: '40%', done: false },
];

// ---- helpers ---------------------------------------------------------------

const initials = (name) => (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function isToday(d) { return d && startOfDay(d).getTime() === startOfDay(new Date()).getTime(); }
function isYesterday(d) {
  if (!d) return false;
  const y = startOfDay(new Date());
  y.setDate(y.getDate() - 1);
  return startOfDay(d).getTime() === y.getTime();
}

// Find the employee behind the logged-in user (self-heals older orphan links).
async function resolveEmployee(req) {
  if (req.user.employee) {
    const e = await Employee.findOne({ _id: req.user.employee, company: req.user.company });
    if (e) return e;
  }
  if (req.user.email) {
    const e = await Employee.findOne({ company: req.user.company, email: req.user.email });
    if (e) {
      await User.updateOne({ _id: req.user._id }, { employee: e._id });
      return e;
    }
  }
  return null;
}

async function getOrCreate(company, employeeId) {
  let p = await GamificationProfile.findOne({ company, employee: employeeId });
  if (!p) p = await GamificationProfile.create({ company, employee: employeeId });
  return p;
}

// Apply an earning rule to a profile doc (mutates; caller saves).
function applyAward(profile, type, labelOverride) {
  const rule = EARNING[type];
  if (!rule) return { xp: 0, coins: 0, newBadges: [] };
  profile.xp += rule.xp;
  profile.coins += rule.coins;
  if (rule.counter) profile.counters[rule.counter] = (profile.counters[rule.counter] || 0) + 1;
  profile.events.push({ type, label: labelOverride || rule.label, xp: rule.xp, coins: rule.coins, at: new Date() });
  if (profile.events.length > 30) profile.events = profile.events.slice(-30);
  const before = new Set(profile.badges || []);
  profile.badges = evaluateBadges(profile);
  const newBadges = profile.badges.filter((k) => !before.has(k));
  return { xp: rule.xp, coins: rule.coins, newBadges };
}

function summarize(profile, name) {
  const lv = levelFromXp(profile.xp);
  const wins = [...profile.events]
    .filter((e) => e.xp > 0)
    .slice(-6)
    .reverse()
    .map((e) => ({ icon: EVENT_EMOJI[e.type] || '⭐', label: e.label, pts: e.xp }));
  return {
    name,
    level: lv.level,
    levelName: lv.levelName,
    nextLevel: lv.nextLevel,
    xp: profile.xp,
    xpForNext: lv.xpForNext,
    coins: profile.coins,
    streak: profile.streak,
    badgesEarned: (profile.badges || []).length,
    badgesTotal: BADGES.length,
    recentWins: wins,
    weeklyGoals: WEEKLY_GOALS,
  };
}

// ---- endpoints -------------------------------------------------------------

// GET /api/gamification/me
const me = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  if (!emp) return res.json({ hasProfile: false });
  const profile = await getOrCreate(req.user.company, emp._id);
  res.json({ hasProfile: true, ...summarize(profile, emp.name), checkedInToday: isToday(profile.lastCheckin) });
});

// POST /api/gamification/checkin
const checkin = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  if (!emp) throw new ApiError(400, 'Your account is not linked to an employee profile.');
  const profile = await getOrCreate(req.user.company, emp._id);

  if (isToday(profile.lastCheckin)) {
    return res.json({ alreadyCheckedIn: true, ...summarize(profile, emp.name), checkedInToday: true });
  }
  profile.streak = isYesterday(profile.lastCheckin) ? profile.streak + 1 : 1;
  profile.lastCheckin = new Date();
  const awarded = applyAward(profile, 'CHECKIN');
  await profile.save();
  res.json({ awarded, ...summarize(profile, emp.name), checkedInToday: true });
});

// GET /api/gamification/colleagues — pickable recipients for kudos.
const colleagues = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  const filter = { company: req.user.company, status: 'ACTIVE' };
  if (emp) filter._id = { $ne: emp._id };
  const list = await Employee.find(filter).select('name department').sort('name');
  res.json({ colleagues: list.map((e) => ({ id: e._id, name: e.name, department: e.department || '' })) });
});

// POST /api/gamification/kudos  { to: employeeId }
const kudos = asyncHandler(async (req, res) => {
  const giver = await resolveEmployee(req);
  if (!giver) throw new ApiError(400, 'Your account is not linked to an employee profile.');

  if (!req.body.to) throw new ApiError(400, 'Pick a colleague to give kudos to.');
  const recipient = await Employee.findOne({ _id: req.body.to, company: req.user.company });
  if (!recipient) throw new ApiError(404, 'Colleague not found.');
  if (String(recipient._id) === String(giver._id)) throw new ApiError(400, 'You cannot give kudos to yourself.');

  {
    const rp = await getOrCreate(req.user.company, recipient._id);
    applyAward(rp, 'KUDOS', `Kudos from ${giver.name}`);
    await rp.save();
  }
  const gp = await getOrCreate(req.user.company, giver._id);
  const awarded = applyAward(gp, 'KUDOS_GIVEN', recipient ? `Gave kudos to ${recipient.name}` : 'Gave kudos');
  await gp.save();
  res.json({ awarded, to: recipient ? recipient.name : null, ...summarize(gp, giver.name) });
});

// POST /api/gamification/award  { type }
const award = asyncHandler(async (req, res) => {
  const type = String(req.body.type || '').toUpperCase();
  if (!SELF_ACTIONS.includes(type)) throw new ApiError(400, 'Unsupported action');
  const emp = await resolveEmployee(req);
  if (!emp) throw new ApiError(400, 'Your account is not linked to an employee profile.');
  const profile = await getOrCreate(req.user.company, emp._id);
  const awarded = applyAward(profile, type);
  await profile.save();
  res.json({ awarded, ...summarize(profile, emp.name) });
});

// GET /api/gamification/leaderboard
const leaderboard = asyncHandler(async (req, res) => {
  const profiles = await GamificationProfile.find({ company: req.user.company })
    .populate('employee', 'name department');
  const withEmp = profiles.filter((p) => p.employee);

  const top = withEmp
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10)
    .map((p, i) => ({ rank: i + 1, name: p.employee.name, initials: initials(p.employee.name), coins: p.coins }));

  const byDept = {};
  withEmp.forEach((p) => {
    const d = p.employee.department || 'Unassigned';
    byDept[d] = (byDept[d] || 0) + p.coins;
  });
  const medals = ['🥇', '🥈', '🥉'];
  const teamBoard = Object.entries(byDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e, i) => ({ rank: i + 1, medal: medals[i] || '', name: e[0], coins: e[1] }));

  res.json({ leaderboard: top, teamBoard });
});

// GET /api/gamification/badges
const badges = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  let earned = [];
  if (emp) {
    const p = await getOrCreate(req.user.company, emp._id);
    earned = p.badges || [];
  }
  res.json({
    badges: BADGES.map((b) => ({ emoji: b.emoji, name: b.name, desc: b.desc, earned: earned.includes(b.key) })),
  });
});

async function redeemedCounts(company) {
  const rows = await Redemption.aggregate([
    { $match: { company } },
    { $group: { _id: '$rewardKey', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

// GET /api/gamification/rewards
const rewards = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  let coins = 0;
  if (emp) {
    const p = await getOrCreate(req.user.company, emp._id);
    coins = p.coins;
  }
  const counts = await redeemedCounts(req.user.company);
  const list = REWARDS.map((r) => {
    const redeemed = counts[r.key] || 0;
    const remaining = r.stock == null ? null : Math.max(0, r.stock - redeemed);
    return {
      key: r.key,
      emoji: r.emoji,
      name: r.name,
      cost: r.cost,
      stock: remaining == null ? '∞' : remaining,
      soldOut: remaining === 0,
      affordable: coins >= r.cost,
    };
  });
  res.json({ coins, rewards: list });
});

// POST /api/gamification/rewards/:key/redeem
const redeem = asyncHandler(async (req, res) => {
  const reward = REWARDS.find((r) => r.key === req.params.key);
  if (!reward) throw new ApiError(404, 'Reward not found');
  const emp = await resolveEmployee(req);
  if (!emp) throw new ApiError(400, 'Your account is not linked to an employee profile.');
  const profile = await getOrCreate(req.user.company, emp._id);

  if (profile.coins < reward.cost) throw new ApiError(400, 'Not enough coins to redeem this reward.');
  if (reward.stock != null) {
    const n = await Redemption.countDocuments({ company: req.user.company, rewardKey: reward.key });
    if (n >= reward.stock) throw new ApiError(400, 'This reward is out of stock.');
  }

  profile.coins -= reward.cost;
  profile.events.push({ type: 'REDEEM', label: `Redeemed ${reward.name}`, xp: 0, coins: -reward.cost, at: new Date() });
  await profile.save();
  await Redemption.create({ company: req.user.company, employee: emp._id, rewardKey: reward.key, name: reward.name, cost: reward.cost });

  res.json({ coins: profile.coins, redeemed: reward.name });
});

// GET /api/gamification/rules  (admin console data)
const rules = asyncHandler(async (req, res) => {
  const earningRules = Object.entries(EARNING)
    .filter(([k]) => k !== 'KUDOS_GIVEN')
    .map(([, r]) => ({ event: r.label, xp: r.xp, coins: r.coins, cap: r.cap, on: !r.off }));
  const levelThresholds = LEVELS.filter((l) => l.level >= 6).map((l) => ({
    level: l.level,
    name: l.name,
    xp: l.xp.toLocaleString() + ' XP',
  }));
  const badgeTriggers = BADGES.slice(0, 5).map((b) => ({ emoji: b.emoji, name: b.name, rule: b.trigger }));

  const counts = await redeemedCounts(req.user.company);
  const profiles = await GamificationProfile.find({ company: req.user.company }).select('coins');
  const reds = await Redemption.find({ company: req.user.company }).select('cost');
  const redeemedCoins = reds.reduce((s, r) => s + (r.cost || 0), 0);
  const outstanding = profiles.reduce((s, p) => s + (p.coins || 0), 0);

  const rewardCatalog = REWARDS.map((r) => {
    const redeemed = counts[r.key] || 0;
    const remaining = r.stock == null ? '∞' : Math.max(0, r.stock - redeemed);
    const status = r.stock != null && remaining <= 3 ? 'Low stock' : 'Active';
    return { name: `${r.emoji} ${r.name}`, cost: r.cost, stock: remaining, redeemed, status };
  });

  res.json({
    earningRules,
    levelThresholds,
    badgeTriggers,
    rewardCatalog,
    kpis: { issued: outstanding + redeemedCoins, redeemed: redeemedCoins, activeBadges: BADGES.length, budget: '₹25k' },
  });
});

// POST /api/gamification/seed-demo  (admin) — populate profiles so the boards look alive.
const seedDemo = asyncHandler(async (req, res) => {
  const emps = await Employee.find({ company: req.user.company, status: 'ACTIVE' }).select('name');
  let n = 0;
  for (const e of emps) {
    const p = await getOrCreate(req.user.company, e._id);
    const base = 200 + Math.floor(Math.random() * 2200);
    p.xp = base;
    p.coins = Math.floor(base * 0.8);
    p.streak = Math.floor(Math.random() * 18);
    p.counters.checkins = Math.floor(Math.random() * 25);
    p.counters.kudosReceived = Math.floor(Math.random() * 30);
    p.counters.certs = Math.random() > 0.5 ? 1 : 0;
    p.counters.goalsCompleted = Math.floor(Math.random() * 7);
    p.counters.bugFixes = Math.floor(Math.random() * 12);
    p.counters.timesheets = Math.floor(Math.random() * 6);
    p.badges = evaluateBadges(p);
    await p.save();
    n++;
  }
  res.json({ seeded: n });
});

module.exports = { me, checkin, colleagues, kudos, award, leaderboard, badges, rewards, redeem, rules, seedDemo };
