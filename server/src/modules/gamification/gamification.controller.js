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
  STAT_LABELS,
  levelFromXp,
  badgeRule,
  defaultEarning,
} = require('../../config/gamification');
const { loadConfig, getOrCreate, applyAward } = require('./awardService');

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

function summarize(profile, name, cfg) {
  const lv = levelFromXp(profile.xp, cfg?.levels);
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
    badgesTotal: (cfg?.badges || []).length,
    recentWins: wins,
  };
}

// ---- endpoints -------------------------------------------------------------

// GET /api/gamification/me
const me = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  if (!emp) return res.json({ hasProfile: false });
  const profile = await getOrCreate(req.user.company, emp._id);
  const cfg = await loadConfig(req.user.company);
  res.json({ hasProfile: true, ...summarize(profile, emp.name, cfg), checkedInToday: isToday(profile.lastCheckin) });
});

// POST /api/gamification/checkin
const checkin = asyncHandler(async (req, res) => {
  const emp = await resolveEmployee(req);
  if (!emp) throw new ApiError(400, 'Your account is not linked to an employee profile.');
  const profile = await getOrCreate(req.user.company, emp._id);
  const cfg = await loadConfig(req.user.company);

  if (isToday(profile.lastCheckin)) {
    return res.json({ alreadyCheckedIn: true, ...summarize(profile, emp.name, cfg), checkedInToday: true });
  }
  profile.streak = isYesterday(profile.lastCheckin) ? profile.streak + 1 : 1;
  profile.lastCheckin = new Date();
  const awarded = applyAward(profile, 'CHECKIN', cfg);
  await profile.save();
  res.json({ awarded, ...summarize(profile, emp.name, cfg), checkedInToday: true });
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

  const cfg = await loadConfig(req.user.company);
  {
    const rp = await getOrCreate(req.user.company, recipient._id);
    applyAward(rp, 'KUDOS', cfg, `Kudos from ${giver.name}`);
    await rp.save();
  }
  const gp = await getOrCreate(req.user.company, giver._id);
  const awarded = applyAward(gp, 'KUDOS_GIVEN', cfg, `Gave kudos to ${recipient.name}`);
  await gp.save();
  res.json({ awarded, to: recipient ? recipient.name : null, ...summarize(gp, giver.name, cfg) });
});

// POST /api/gamification/award  { type }
const award = asyncHandler(async (req, res) => {
  const type = String(req.body.type || '').toUpperCase();
  if (!SELF_ACTIONS.includes(type)) throw new ApiError(400, 'Unsupported action');
  const emp = await resolveEmployee(req);
  if (!emp) throw new ApiError(400, 'Your account is not linked to an employee profile.');
  const profile = await getOrCreate(req.user.company, emp._id);
  const cfg = await loadConfig(req.user.company);
  const awarded = applyAward(profile, type, cfg);
  await profile.save();
  res.json({ awarded, ...summarize(profile, emp.name, cfg) });
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
  const cfg = await loadConfig(req.user.company);
  const emp = await resolveEmployee(req);
  let earned = [];
  if (emp) {
    const p = await getOrCreate(req.user.company, emp._id);
    earned = p.badges || [];
  }
  res.json({
    badges: cfg.badges
      .filter((b) => b.enabled !== false)
      .map((b) => ({ emoji: b.emoji, name: b.name, desc: b.desc, earned: earned.includes(b.key) })),
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
  const cfg = await loadConfig(req.user.company);
  const counts = await redeemedCounts(req.user.company);
  const list = cfg.rewards.filter((r) => r.active !== false).map((r) => {
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
  const cfg = await loadConfig(req.user.company);
  const reward = cfg.rewards.find((r) => r.key === req.params.key && r.active !== false);
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

// GET /api/gamification/rules  (admin console — editable config + read-only info)
const rules = asyncHandler(async (req, res) => {
  const cfg = await loadConfig(req.user.company);
  const counts = await redeemedCounts(req.user.company);
  const profiles = await GamificationProfile.find({ company: req.user.company }).select('coins');
  const reds = await Redemption.find({ company: req.user.company }).select('cost');
  const redeemedCoins = reds.reduce((s, r) => s + (r.cost || 0), 0);
  const outstanding = profiles.reduce((s, p) => s + (p.coins || 0), 0);

  res.json({
    earning: cfg.earning.map((e) => ({ event: e.event, label: e.label, xp: e.xp, coins: e.coins, cap: e.cap, on: e.on })),
    earningCatalog: defaultEarning(), // full set of possible events, for re-adding deleted rules
    rewards: cfg.rewards.map((r) => ({
      key: r.key, emoji: r.emoji, name: r.name, cost: r.cost, stock: r.stock, active: r.active !== false, redeemed: counts[r.key] || 0,
    })),
    budget: cfg.budget,
    badges: cfg.badges.map((b) => ({
      key: b.key, emoji: b.emoji, name: b.name, desc: b.desc, stat: b.stat,
      threshold: b.threshold, enabled: b.enabled !== false, rule: badgeRule(b),
    })),
    levels: cfg.levels.slice().sort((a, b) => a.xp - b.xp).map((l) => ({ level: l.level, name: l.name, xp: l.xp })),
    stats: STAT_LABELS,
    kpis: {
      issued: outstanding + redeemedCoins,
      redeemed: redeemedCoins,
      activeBadges: cfg.badges.filter((b) => b.enabled !== false).length,
      budget: cfg.budget,
    },
  });
});

// PUT /api/gamification/config  (admin) — save editable rules, rewards and budget.
const slug = (s) =>
  String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'REWARD';

const updateConfig = asyncHandler(async (req, res) => {
  const cfg = await loadConfig(req.user.company);
  const { earning, rewards: rw, budget } = req.body;

  if (Array.isArray(earning)) {
    cfg.earning = earning
      .filter((e) => e && e.event)
      .map((e) => ({
        event: e.event, label: e.label, xp: Number(e.xp) || 0, coins: Number(e.coins) || 0,
        cap: e.cap || '—', on: e.on !== false,
      }));
  }
  if (Array.isArray(rw)) {
    const used = new Set();
    cfg.rewards = rw
      .filter((r) => r && r.name && String(r.name).trim())
      .map((r) => {
        let key = r.key || slug(r.name);
        while (used.has(key)) key += '_2';
        used.add(key);
        const raw = r.stock === '' || r.stock == null ? null : Number(r.stock);
        return {
          key, emoji: r.emoji || '🎁', name: String(r.name).trim(),
          cost: Number(r.cost) || 0, stock: Number.isNaN(raw) ? null : raw, active: r.active !== false,
        };
      });
  }
  if (Array.isArray(req.body.badges)) {
    const usedB = new Set();
    cfg.badges = req.body.badges
      .filter((b) => b && b.name && String(b.name).trim())
      .map((b) => {
        let key = b.key || slug(b.name);
        while (usedB.has(key)) key += '_2';
        usedB.add(key);
        return {
          key, emoji: b.emoji || '🏅', name: String(b.name).trim(), desc: b.desc || '',
          stat: b.stat || 'xp', threshold: Number(b.threshold) || 0, enabled: b.enabled !== false,
        };
      });
  }
  if (Array.isArray(req.body.levels)) {
    cfg.levels = req.body.levels
      .filter((l) => l && l.name && String(l.name).trim())
      .map((l, i) => ({ level: Number(l.level) || i + 1, name: String(l.name).trim(), xp: Number(l.xp) || 0 }));
  }
  if (budget !== undefined) cfg.budget = String(budget);

  await cfg.save();
  res.json({ ok: true });
});

// POST /api/gamification/grant  { employee, event }  (admin) — award an action to an employee.
const grant = asyncHandler(async (req, res) => {
  const { employee, event } = req.body;
  if (!employee || !event) throw new ApiError(400, 'employee and event are required');
  const type = String(event).toUpperCase();
  if (type === 'KUDOS_GIVEN' || !EARNING[type]) throw new ApiError(400, 'Unknown earning action');

  const emp = await Employee.findOne({ _id: employee, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');

  const cfg = await loadConfig(req.user.company);
  const profile = await getOrCreate(req.user.company, emp._id);
  const awarded = applyAward(profile, type, cfg, `${EARNING[type].label} (granted)`);
  await profile.save();
  res.json({ awarded, employee: emp.name });
});

module.exports = { me, checkin, colleagues, kudos, award, leaderboard, badges, rewards, redeem, rules, updateConfig, grant };
