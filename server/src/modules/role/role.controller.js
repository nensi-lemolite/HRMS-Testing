const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Role = require('../../models/Role');
const ApiError = require('../../utils/ApiError');
const { PERMISSIONS } = require('../../config/permissions');

// GET /api/roles/catalog
const catalog = asyncHandler(async (req, res) => {
  const roles = await Role.find({ company: req.user.company }).sort({ isSystem: -1, key: 1 });
  res.json({
    permissions: PERMISSIONS,
    roles,
  });
});

// GET /api/roles/users
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ company: req.user.company })
    .select('email name role isActive employee createdAt lastLoginAt')
    .populate('employee', 'empCode department designation profilePhoto status name')
    .sort({ createdAt: -1 });
  res.json({ users });
});

// PATCH /api/roles/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const target = await User.findOne({ _id: req.params.id, company: req.user.company });
  if (!target) throw new ApiError(404, 'User not found');

  if (req.body.role) {
    const role = await Role.findOne({ company: req.user.company, key: req.body.role });
    if (!role) throw new ApiError(400, 'Invalid role');
    if (target.role === 'SUPER_ADMIN' && req.body.role !== 'SUPER_ADMIN') {
      const count = await User.countDocuments({ company: req.user.company, role: 'SUPER_ADMIN', isActive: true });
      if (count <= 1) throw new ApiError(400, 'At least one SUPER_ADMIN must remain');
    }
    target.role = req.body.role;
  }
  if (typeof req.body.isActive === 'boolean') {
    target.isActive = req.body.isActive;
  }
  await target.save();
  res.json({ user: target });
});

// POST /api/roles
const createRole = asyncHandler(async (req, res) => {
  const { key, label, description, permissions } = req.body;
  if (!key || !label) throw new ApiError(400, 'key and label are required');

  const validKeys = new Set(PERMISSIONS.map((p) => p.key));
  const cleanedPerms = (permissions || []).filter((p) => validKeys.has(p));

  const exists = await Role.findOne({ company: req.user.company, key: key.toUpperCase() });
  if (exists) throw new ApiError(409, 'A role with this key already exists');

  const role = await Role.create({
    company: req.user.company,
    key: key.toUpperCase(),
    label,
    description: description || '',
    permissions: cleanedPerms,
    isSystem: false,
  });
  res.status(201).json({ role });
});

// PATCH /api/roles/:id
const updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, company: req.user.company });
  if (!role) throw new ApiError(404, 'Role not found');

  if (req.body.label !== undefined) role.label = req.body.label;
  if (req.body.description !== undefined) role.description = req.body.description;
  if (Array.isArray(req.body.permissions)) {
    const validKeys = new Set(PERMISSIONS.map((p) => p.key));
    role.permissions = req.body.permissions.filter((p) => validKeys.has(p));
  }
  if (req.body.key && !role.isSystem) {
    const newKey = req.body.key.toUpperCase();
    if (newKey !== role.key) {
      const exists = await Role.findOne({ company: req.user.company, key: newKey });
      if (exists) throw new ApiError(409, 'A role with this key already exists');
      await User.updateMany({ company: req.user.company, role: role.key }, { role: newKey });
      role.key = newKey;
    }
  }
  await role.save();
  res.json({ role });
});

// DELETE /api/roles/:id
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, company: req.user.company });
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.isSystem) throw new ApiError(400, 'System roles cannot be deleted');
  const inUse = await User.countDocuments({ company: req.user.company, role: role.key });
  if (inUse > 0) throw new ApiError(400, `Cannot delete — ${inUse} user(s) still have this role`);
  await Role.deleteOne({ _id: role._id });
  res.json({ deleted: true });
});

module.exports = { catalog, listUsers, updateUser, createRole, updateRole, deleteRole };
