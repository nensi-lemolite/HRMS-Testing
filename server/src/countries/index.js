const india = require('./india');
const qatar = require('./qatar');

const PROFILES = {
  IN: india,
  QA: qatar,
};

function getCountryProfile(code) {
  const profile = PROFILES[String(code || '').toUpperCase()];
  if (!profile) {
    throw new Error(`Unsupported country code: ${code}`);
  }
  return profile;
}

function listCountries() {
  return Object.values(PROFILES).map((p) => ({
    code: p.code,
    name: p.name,
    timezone: p.timezone,
    currency: p.currency.code,
  }));
}

module.exports = { getCountryProfile, listCountries };
