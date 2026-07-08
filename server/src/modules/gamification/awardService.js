// Shared gamification award logic, usable from any module (performance,
// employees, referrals) to grant points to an employee automatically.
const GamificationProfile = require('../../models/GamificationProfile');
const GamificationConfig = require('../../models/GamificationConfig');
const {
  EARNING,
  evaluateBadges,
  defaultEarning,
  defaultRewards,
  defaultBadges,
  defaultLevels,
} = require('../../config/gamification');

async function loadConfig(companyId) {
  let cfg = await GamificationConfig.findOne({ company: companyId });
  if (!cfg) {
    return GamificationConfig.create({
      company: companyId,
      earning: defaultEarning(),
      rewards: defaultRewards(),
      badges: defaultBadges(),
      levels: defaultLevels(),
    });
  }
  let changed = false;
  if (!cfg.badges || !cfg.badges.length) { cfg.badges = defaultBadges(); changed = true; }
  if (!cfg.levels || !cfg.levels.length) { cfg.levels = defaultLevels(); changed = true; }
  if (changed) await cfg.save();
  return cfg;
}

async function getOrCreate(company, employeeId) {
  let p = await GamificationProfile.findOne({ company, employee: employeeId });
  if (!p) p = await GamificationProfile.create({ company, employee: employeeId });
  return p;
}

// Effective earning rule for an action, honoring the company's config overrides.
function ruleFor(cfg, type) {
  const d = EARNING[type];
  if (type === 'KUDOS_GIVEN') return d ? { xp: d.xp, coins: d.coins, counter: d.counter, label: d.label } : null;
  const c = (cfg?.earning || []).find((e) => e.event === type);
  if (!c) return { xp: 0, coins: 0, counter: d?.counter, label: d?.label || type };
  return {
    xp: c.on ? Number(c.xp) || 0 : 0,
    coins: c.on ? Number(c.coins) || 0 : 0,
    counter: d?.counter,
    label: c.label || d?.label || type,
  };
}

// Apply an earning rule to a profile doc (mutates; caller saves).
function applyAward(profile, type, cfg, labelOverride) {
  const rule = ruleFor(cfg, type);
  if (!rule) return { xp: 0, coins: 0, newBadges: [] };
  profile.xp += rule.xp;
  profile.coins += rule.coins;
  if (rule.counter) profile.counters[rule.counter] = (profile.counters[rule.counter] || 0) + 1;
  profile.events.push({ type, label: labelOverride || rule.label, xp: rule.xp, coins: rule.coins, at: new Date() });
  if (profile.events.length > 30) profile.events = profile.events.slice(-30);
  const before = new Set(profile.badges || []);
  profile.badges = evaluateBadges(profile, cfg?.badges);
  const newBadges = profile.badges.filter((k) => !before.has(k));
  return { xp: rule.xp, coins: rule.coins, newBadges };
}

// Award an earning event to an employee. Best-effort — never throws to the caller.
async function awardEmployee(companyId, employeeId, event, labelOverride) {
  try {
    if (!companyId || !employeeId) return null;
    const cfg = await loadConfig(companyId);
    const profile = await getOrCreate(companyId, employeeId);
    const awarded = applyAward(profile, String(event).toUpperCase(), cfg, labelOverride);
    await profile.save();
    return awarded;
  } catch (e) {
    console.warn('[gamification] awardEmployee failed', e.message);
    return null;
  }
}

module.exports = { loadConfig, getOrCreate, ruleFor, applyAward, awardEmployee };
