/* eslint-disable no-console */
// Idempotent migration:
// 1) Backfill new Employee defaults (address, emergencyContact, employmentType, workMode)
// 2) Backfill User.lastLoginAt = null when missing
// 3) Re-sync system Role docs so they include newly-added permission keys
// 4) For Employees with a non-empty salaryStructure but no SalaryHistory rows, insert
//    an INITIAL row pegged to their joinDate.
//
// Usage:  node src/migrations/2026-05-27-expand-employee.js

const path = require('path');
const mongoose = require('mongoose');

const env = require('../config/env');
const { connectDB } = require('../config/db');

const Employee = require('../models/Employee');
const User = require('../models/User');
const Role = require('../models/Role');
const SalaryHistory = require('../models/SalaryHistory');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../config/permissions');

async function backfillEmployees() {
  let updated = 0;
  let skipped = 0;
  const cursor = Employee.find().cursor();
  for await (const emp of cursor) {
    let touched = false;

    if (!emp.address || !emp.address.current) {
      emp.address = emp.address || {};
      emp.address.current = emp.address.current || {};
      touched = true;
    }
    if (!emp.address.permanent) {
      emp.address.permanent = {};
      touched = true;
    }
    if (!emp.emergencyContact || typeof emp.emergencyContact !== 'object') {
      emp.emergencyContact = {};
      touched = true;
    }
    if (!emp.employmentType) {
      emp.employmentType = 'FULL_TIME';
      touched = true;
    }
    if (!emp.workMode) {
      emp.workMode = 'WFO';
      touched = true;
    }
    if (!Array.isArray(emp.skills)) {
      emp.skills = [];
      touched = true;
    }
    if (!Array.isArray(emp.certifications)) {
      emp.certifications = [];
      touched = true;
    }
    if (!Array.isArray(emp.technologyStack)) {
      emp.technologyStack = [];
      touched = true;
    }
    if (!Array.isArray(emp.weeklyOff)) {
      emp.weeklyOff = [];
      touched = true;
    }

    if (touched) {
      await emp.save();
      updated += 1;
    } else {
      skipped += 1;
    }
  }
  return { updated, skipped };
}

async function backfillUsers() {
  const r = await User.updateMany(
    { lastLoginAt: { $exists: false } },
    { $set: { lastLoginAt: null } },
  );
  return { modified: r.modifiedCount };
}

async function syncRolePermissions() {
  const allPermKeys = PERMISSIONS.map((p) => p.key);
  const systemRoles = await Role.find({ isSystem: true });
  let updated = 0;
  for (const role of systemRoles) {
    const desired = role.key === 'SUPER_ADMIN'
      ? allPermKeys
      : (ROLE_PERMISSIONS[role.key] || role.permissions);
    const existing = new Set(role.permissions || []);
    const merged = Array.from(new Set([...(role.permissions || []), ...desired]));
    // Only write if changed
    if (merged.length !== existing.size || merged.some((k) => !existing.has(k))) {
      role.permissions = merged;
      await role.save();
      updated += 1;
    }
  }
  return { updated };
}

async function seedInitialSalaryHistory() {
  let inserted = 0;
  let skipped = 0;
  const cursor = Employee.find({
    salaryStructure: { $exists: true, $ne: [] },
  }).cursor();
  for await (const emp of cursor) {
    const has = await SalaryHistory.exists({ employee: emp._id });
    if (has) {
      skipped += 1;
      continue;
    }
    const components = (emp.salaryStructure || []).map((c) => ({
      code: c.code,
      label: c.label,
      amount: c.amount,
    }));
    const ctc = emp.ctc || components.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    const basic = emp.basicSalary || (components.find((c) => /BASIC/i.test(c.code))?.amount);
    await SalaryHistory.create({
      company: emp.company,
      employee: emp._id,
      effectiveFrom: emp.joinDate || emp.createdAt || new Date(),
      ctc,
      basic,
      components,
      reason: 'INITIAL',
    });
    inserted += 1;
  }
  return { inserted, skipped };
}

async function run() {
  await connectDB(env.mongoUri);
  console.log('[migration] connected');

  const e = await backfillEmployees();
  console.log('[migration] employees:', e);

  const u = await backfillUsers();
  console.log('[migration] users:', u);

  const r = await syncRolePermissions();
  console.log('[migration] roles:', r);

  const s = await seedInitialSalaryHistory();
  console.log('[migration] salary history:', s);

  await mongoose.disconnect();
  console.log('[migration] done');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[migration] failed', err);
    process.exit(1);
  });
}

module.exports = { run };
