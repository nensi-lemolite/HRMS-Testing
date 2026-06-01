const Company = require('../models/Company');
const { getCountryProfile } = require('../countries');
const ApiError = require('../utils/ApiError');

/**
 * Resolves the active country for the request.
 * Priority:
 *   1. ?country=QA query param (HR/Admin can switch view)
 *   2. X-Country header
 *   3. Logged-in user's country
 *   4. Company default
 *
 * Stores: req.country (e.g. 'IN'), req.countryProfile (full module).
 * Non-admin roles cannot override their own country.
 */
async function resolveCountry(req, res, next) {
  try {
    const user = req.user;
    if (!user) return next(new ApiError(401, 'Not authenticated'));

    const requested = (req.query.country || req.headers['x-country'] || '').toString().toUpperCase();

    let country = user.country;
    if (requested) {
      const adminRoles = ['SUPER_ADMIN', 'HR_ADMIN'];
      if (adminRoles.includes(user.role)) {
        country = requested;
      } else if (requested !== user.country) {
        return next(new ApiError(403, 'You cannot view a different country'));
      }
    }

    // Validate against company's enabled countries
    const company = await Company.findById(user.company);
    if (!company) return next(new ApiError(404, 'Company not found'));
    if (company.enabledCountries?.length && !company.enabledCountries.includes(country)) {
      return next(new ApiError(400, `Country ${country} not enabled for this company`));
    }

    req.country = country;
    req.countryProfile = getCountryProfile(country);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveCountry };
