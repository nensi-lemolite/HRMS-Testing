const Role = require('../models/Role');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../config/permissions');

const ROLE_LABELS = {
  SUPER_ADMIN: { label: 'Super Admin', description: 'Full access. Manage everything including roles.' },
  HR_ADMIN:    { label: 'HR Admin',    description: 'Manage employees, payroll, leave and attendance across the company.' },
  MANAGER:     { label: 'Manager',     description: 'View and approve for their team. Limited admin.' },
  EMPLOYEE:    { label: 'Employee',    description: 'Self-service: own profile, leave, attendance, payslip.' },
};

const DEFAULT_LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave',    annualQuota: 12, carryForward: 0 },
  { code: 'SL', name: 'Sick Leave',      annualQuota: 7,  carryForward: 0 },
  { code: 'EL', name: 'Earned Leave',    annualQuota: 18, carryForward: 30 },
  { code: 'ML', name: 'Maternity Leave', annualQuota: 182, carryForward: 0 },
];

async function seedCompanyDefaults(company) {
  const companyId = company._id || company;
  const allPermKeys = PERMISSIONS.map((p) => p.key);
  const roleDocs = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'].map((key) => ({
    company: companyId,
    key,
    label: ROLE_LABELS[key].label,
    description: ROLE_LABELS[key].description,
    permissions: key === 'SUPER_ADMIN' ? allPermKeys : (ROLE_PERMISSIONS[key] || []),
    isSystem: true,
  }));
  await Role.insertMany(roleDocs, { ordered: false }).catch(() => {});

  const leaveDocs = DEFAULT_LEAVE_TYPES.map((t) => ({ ...t, company: companyId }));
  await LeaveType.insertMany(leaveDocs, { ordered: false }).catch(() => {});
}

/**
 * Self-healing: if a company has no Role docs yet (created before the Role model
 * existed) seed them on demand. Idempotent — duplicate index protects re-runs.
 */
async function ensureCompanyDefaults(companyId) {
  if (!companyId) return;
  const count = await Role.countDocuments({ company: companyId });
  if (count === 0) {
    await seedCompanyDefaults(companyId);
  } else {
    // Backfill: for SYSTEM roles in this company that exist but are missing
    // permissions newly added to ROLE_PERMISSIONS, merge them in. Custom
    // additions made by admins are preserved.
    const allPermKeys = PERMISSIONS.map((p) => p.key);
    const systemRoles = await Role.find({ company: companyId, isSystem: true });
    for (const role of systemRoles) {
      const desired = role.key === 'SUPER_ADMIN' ? allPermKeys : (ROLE_PERMISSIONS[role.key] || []);
      const current = new Set(role.permissions || []);
      const before = current.size;
      desired.forEach((k) => current.add(k));
      if (current.size !== before) {
        role.permissions = [...current];
        await role.save();
      }
    }
  }
  const leaveCount = await LeaveType.countDocuments({ company: companyId });
  if (leaveCount === 0) {
    const leaveDocs = DEFAULT_LEAVE_TYPES.map((t) => ({ ...t, company: companyId }));
    await LeaveType.insertMany(leaveDocs, { ordered: false }).catch(() => {});
  }
}

/**
 * Boot-time migration: walks every company and merges any newly added
 * default permissions onto its system roles. Custom roles and custom
 * additions are untouched.
 */
async function backfillSystemRolePerms() {
  const allPermKeys = PERMISSIONS.map((p) => p.key);
  const systemRoles = await Role.find({ isSystem: true });
  let updated = 0;
  for (const role of systemRoles) {
    const desired = role.key === 'SUPER_ADMIN' ? allPermKeys : (ROLE_PERMISSIONS[role.key] || []);
    const current = new Set(role.permissions || []);
    const before = current.size;
    desired.forEach((k) => current.add(k));
    if (current.size !== before) {
      role.permissions = [...current];
      await role.save();
      updated += 1;
    }
  }
  if (updated > 0) {
    console.log(`[seed] backfilled new permissions onto ${updated} system role(s)`);
  }
}

/**
 * Boot-time migration. Two responsibilities, both idempotent:
 *  1. Backfill an Employee record for any non-admin User that lacks one.
 *  2. Detach + remove Employee records previously auto-created for SUPER_ADMINs.
 *
 * SUPER_ADMINs are administrators, not part of the workforce, so they must not
 * appear in the Employees module, headcount, or attendance.
 */
async function backfillEmployeesForOrphanUsers() {
  // (1) Backfill employees for non-admin users missing a link.
  const orphans = await User.find({
    role: { $ne: 'SUPER_ADMIN' },
    $or: [{ employee: { $exists: false } }, { employee: null }],
  });
  let created = 0;
  for (const user of orphans) {
    // Generate a non-clashing empCode per company.
    let suffix = 1;
    let empCode = 'USR-001';
    while (await Employee.exists({ company: user.company, empCode })) {
      suffix += 1;
      empCode = `USR-${String(suffix).padStart(3, '0')}`;
    }
    const employee = await Employee.create({
      company: user.company,
      name: user.name,
      email: user.email,
      empCode,
      country: user.country || 'IN',
      joinDate: user.createdAt || new Date(),
      status: 'ACTIVE',
      designation: '',
    });
    user.employee = employee._id;
    await user.save();
    created += 1;
  }
  if (created > 0) {
    console.log(`[seed] backfilled employee records for ${created} orphan user(s)`);
  }

  // (2) Clean up super-admin employee records created by older versions.
  const admins = await User.find({ role: 'SUPER_ADMIN', employee: { $ne: null } });
  let cleaned = 0;
  for (const admin of admins) {
    await Employee.deleteOne({ _id: admin.employee });
    admin.employee = null;
    await admin.save();
    cleaned += 1;
  }
  if (cleaned > 0) {
    console.log(`[seed] removed ${cleaned} super-admin employee record(s)`);
  }
}

module.exports = {
  seedCompanyDefaults,
  ensureCompanyDefaults,
  backfillSystemRolePerms,
  backfillEmployeesForOrphanUsers,
};
