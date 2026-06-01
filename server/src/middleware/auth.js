const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Role = require('../models/Role');
const ApiError = require('../utils/ApiError');
const { ensureCompanyDefaults } = require('../utils/seedCompany');
const { PERMISSIONS } = require('../config/permissions');

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Missing authentication token');

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid or inactive user');

    req.user = user;
    req.company = user.company;

    // SUPER_ADMIN always has every permission defined in the catalog,
    // regardless of what's stored on the Role doc (which may be stale).
    if (user.role === 'SUPER_ADMIN') {
      req.permissions = ALL_PERMISSION_KEYS;
      return next();
    }

    // Lazily seed defaults for companies created before the Role model existed
    let role = await Role.findOne({ company: user.company, key: user.role });
    if (!role) {
      await ensureCompanyDefaults(user.company);
      role = await Role.findOne({ company: user.company, key: user.role });
    }
    req.permissions = role?.permissions || [];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Forbidden — requires role: ${roles.join(' | ')}`));
    }
    next();
  };
}

function requirePerm(key) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (req.user.role === 'SUPER_ADMIN') return next();
    const perms = req.permissions || [];
    if (!perms.includes(key)) {
      return next(new ApiError(403, `Missing permission: ${key}`));
    }
    next();
  };
}

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

module.exports = { authenticate, requireRole, requirePerm, signToken };
