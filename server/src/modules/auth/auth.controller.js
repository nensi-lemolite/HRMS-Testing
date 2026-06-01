const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Company = require('../../models/Company');
const Role = require('../../models/Role');
const ApiError = require('../../utils/ApiError');
const { signToken } = require('../../middleware/auth');
const { seedCompanyDefaults, ensureCompanyDefaults } = require('../../utils/seedCompany');
const { PERMISSIONS } = require('../../config/permissions');

// POST /api/auth/register-company
// Bootstrap: creates a Company + initial SUPER_ADMIN user. Use once for setup.
// Country setup is decided server-side: every company gets IN + QA enabled with
// IN as default. Admins manage employees per-country once inside.
const registerCompany = asyncHandler(async (req, res) => {
  const { companyName, adminName, email, password } = req.body;
  if (!companyName || !adminName || !email || !password) {
    throw new ApiError(400, 'companyName, adminName, email, password are required');
  }
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const defaultCountry = 'IN';
  const enabledCountries = ['IN', 'QA'];

  const company = await Company.create({ name: companyName, defaultCountry, enabledCountries });
  await seedCompanyDefaults(company);

  // The founder is a SUPER_ADMIN — an administrator, not part of the workforce.
  // We intentionally do NOT create an Employee record for them, so they don't
  // appear in the Employees module, headcount, or attendance.
  const user = new User({
    email,
    name: adminName,
    role: 'SUPER_ADMIN',
    company: company._id,
    country: defaultCountry,
  });
  await user.setPassword(password);
  await user.save();

  const permissions = await getPermissionsFor(company._id, user.role);
  const token = signToken(user);
  res.status(201).json({ token, user, company, permissions });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password required');

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isActive) throw new ApiError(401, 'Invalid credentials');
  const ok = await user.verifyPassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const company = await Company.findById(user.company);
  const permissions = await getPermissionsFor(user.company, user.role);
  const token = signToken(user);
  res.json({ token, user, company, permissions });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.company);
  const permissions = await getPermissionsFor(req.user.company, req.user.role);
  res.json({ user: req.user, company, permissions });
});

// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'currentPassword and newPassword are required');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from the current one');
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User not found');

  const ok = await user.verifyPassword(currentPassword);
  if (!ok) throw new ApiError(401, 'Current password is incorrect');

  await user.setPassword(newPassword);
  await user.save();
  res.json({ ok: true });
});

async function getPermissionsFor(companyId, roleKey) {
  // SUPER_ADMIN always has every permission defined in the catalog,
  // regardless of what's stored in the Role doc (which may be stale).
  if (roleKey === 'SUPER_ADMIN') return PERMISSIONS.map((p) => p.key);

  let role = await Role.findOne({ company: companyId, key: roleKey });
  if (!role) {
    await ensureCompanyDefaults(companyId);
    role = await Role.findOne({ company: companyId, key: roleKey });
  }
  return role?.permissions || [];
}

module.exports = { registerCompany, login, me, changePassword };
