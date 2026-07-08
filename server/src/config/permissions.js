// Central permission catalog. Roles get a list of permissions.
// Permission keys are checked in route guards via requirePerm('employees.write').

const PERMISSIONS = [
  // Employee module
  { key: 'employees.read.all',     label: 'View all employees' },
  { key: 'employees.read.team',    label: 'View team employees' },
  { key: 'employees.read.self',    label: 'View own profile' },
  { key: 'employees.write',        label: 'Create / edit / delete employees' },

  // Attendance
  { key: 'attendance.mark.self',   label: 'Mark own attendance' },
  { key: 'attendance.read.all',    label: 'View all attendance' },
  { key: 'attendance.read.team',   label: 'View team attendance' },

  // Leave
  { key: 'leave.apply',            label: 'Apply for leave' },
  { key: 'leave.approve.all',      label: 'Approve any leave' },
  { key: 'leave.approve.team',     label: 'Approve team leave' },
  { key: 'leave.read.all',         label: 'View all leave requests' },

  // Payroll
  { key: 'payroll.run',            label: 'Run payroll' },
  { key: 'payroll.read.all',       label: 'View all payslips' },
  { key: 'payroll.read.self',      label: 'View own payslip' },

  // Reports
  { key: 'reports.read.all',       label: 'View all reports' },
  { key: 'reports.read.team',      label: 'View team reports' },

  // Roles & users
  { key: 'roles.read',             label: 'View users & roles' },
  { key: 'roles.write',            label: 'Change user roles' },

  // Settings
  { key: 'settings.read',          label: 'View settings' },
  { key: 'settings.write',         label: 'Edit settings' },

  // Documents
  { key: 'documents.read.all',     label: 'View all employee documents' },
  { key: 'documents.read.self',    label: 'View own documents' },
  { key: 'documents.write',        label: 'Upload / delete documents' },

  // Assets
  { key: 'assets.read.all',        label: 'View all asset assignments' },
  { key: 'assets.read.self',       label: 'View own assets' },
  { key: 'assets.write',           label: 'Assign / return assets' },

  // Projects
  { key: 'projects.read',          label: 'View projects' },
  { key: 'projects.write',         label: 'Create / edit projects' },

  // Performance (goals + appraisals)
  { key: 'performance.read.all',   label: 'View all performance records' },
  { key: 'performance.read.self',  label: 'View own performance' },
  { key: 'performance.write',      label: 'Create / edit goals and appraisals' },

  // Exit management
  { key: 'exit.read.all',          label: 'View exit checklists' },
  { key: 'exit.write',             label: 'Manage exit checklists' },

  // Referrals
  { key: 'referrals.refer',        label: 'Submit a referral' },
  { key: 'referrals.read.self',    label: 'View own referrals' },
  { key: 'referrals.read.all',     label: 'View all referrals' },
  { key: 'referrals.write',        label: 'Update referral status & bonus' },
  { key: 'referrals.policy.write', label: 'Edit referral policy' },
];

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key), // everything
  HR_ADMIN: [
    'employees.read.all', 'employees.write',
    'attendance.mark.self', 'attendance.read.all',
    'leave.apply', 'leave.approve.all', 'leave.read.all',
    'payroll.run', 'payroll.read.all', 'payroll.read.self',
    'reports.read.all',
    'roles.read',
    'settings.read', 'settings.write',
    'documents.read.all', 'documents.read.self', 'documents.write',
    'assets.read.all', 'assets.read.self', 'assets.write',
    'projects.read', 'projects.write',
    'performance.read.all', 'performance.read.self', 'performance.write',
    'exit.read.all', 'exit.write',
    'referrals.refer', 'referrals.read.self', 'referrals.read.all',
    'referrals.write', 'referrals.policy.write',
  ],
  MANAGER: [
    'employees.read.team', 'employees.read.self',
    'attendance.mark.self', 'attendance.read.team',
    'leave.apply', 'leave.approve.team',
    'payroll.read.self',
    'reports.read.team',
    'settings.read',
    'documents.read.self',
    'assets.read.self',
    'projects.read', 'projects.write',
    'performance.read.self', 'performance.write',
    'exit.read.all',
    'referrals.refer', 'referrals.read.self', 'referrals.read.all',
  ],
  EMPLOYEE: [
    'employees.read.self',
    'attendance.mark.self',
    'leave.apply',
    'payroll.read.self',
    'settings.read',
    'documents.read.self',
    'assets.read.self',
    'performance.read.self',
    'referrals.refer', 'referrals.read.self',
  ],
};

const ROLES = Object.keys(ROLE_PERMISSIONS);

function rolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function hasPermission(role, key) {
  return rolePermissions(role).includes(key);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, ROLES, rolePermissions, hasPermission };
