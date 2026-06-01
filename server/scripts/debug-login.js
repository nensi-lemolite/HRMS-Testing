/* eslint-disable no-console */
// Diagnose why a login is failing.
//
//   node scripts/debug-login.js <email> [optional-password]
//
// Reports whether the User exists, its key fields, the linked Employee,
// and (if a password is passed) whether bcrypt verifies it.

const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const Employee = require('../src/models/Employee');

async function main() {
  const rawEmail = process.argv[2];
  const password = process.argv[3];

  if (!rawEmail) {
    console.error('Usage: node scripts/debug-login.js <email> [password]');
    process.exit(1);
  }

  const email = String(rawEmail).trim().toLowerCase();
  console.log(`\n[input ] email = "${rawEmail}"`);
  console.log(`[input ] normalized = "${email}"`);

  await mongoose.connect(env.mongoUri);
  console.log('[db    ] connected\n');

  // 1) Exact match
  const user = await User.findOne({ email });
  if (!user) {
    console.log(`[user  ] ❌ no User found with email "${email}"`);

    // Show similar matches
    const similar = await User.find({ email: { $regex: rawEmail.split('@')[0], $options: 'i' } }).limit(5);
    if (similar.length > 0) {
      console.log('\n[hint  ] Similar emails in the database:');
      similar.forEach((u) => console.log(`         · ${u.email}  (role=${u.role}, isActive=${u.isActive})`));
    } else {
      console.log('\n[hint  ] No similar emails either. The User account does not exist.');
    }

    // Check Employee table too
    const employees = await Employee.find({ email: { $regex: rawEmail.split('@')[0], $options: 'i' } }).limit(5);
    if (employees.length > 0) {
      console.log('\n[hint  ] Matching Employees (no login linked unless an email match in User):');
      for (const e of employees) {
        const linked = await User.findOne({ employee: e._id });
        console.log(`         · ${e.name} (${e.empCode}) employee.email="${e.email}"  →  linked User: ${linked ? `email="${linked.email}"` : 'NONE'}`);
      }
    }

    await mongoose.disconnect();
    return;
  }

  console.log('[user  ] ✅ found');
  console.log(`         _id          = ${user._id}`);
  console.log(`         email        = "${user.email}"`);
  console.log(`         name         = "${user.name}"`);
  console.log(`         role         = ${user.role}`);
  console.log(`         isActive     = ${user.isActive}`);
  console.log(`         company      = ${user.company}`);
  console.log(`         employee ref = ${user.employee || '(none)'}`);
  console.log(`         lastLoginAt  = ${user.lastLoginAt || '(never)'}`);
  console.log(`         passwordHash = ${user.passwordHash ? user.passwordHash.slice(0, 20) + '…' : '(none)'}`);

  if (user.employee) {
    const emp = await Employee.findById(user.employee);
    if (emp) {
      console.log('\n[emp   ] linked Employee:');
      console.log(`         _id       = ${emp._id}`);
      console.log(`         empCode   = ${emp.empCode}`);
      console.log(`         name      = ${emp.name}`);
      console.log(`         email     = "${emp.email}"`);
      console.log(`         status    = ${emp.status}`);
      if (emp.email !== user.email) {
        console.log(`\n[warn  ] ⚠ Employee.email "${emp.email}" ≠ User.email "${user.email}"`);
        console.log('         Login must use User.email, not Employee.email.');
      }
    }
  }

  if (!user.isActive) {
    console.log('\n[fatal ] ❌ user.isActive === false → login is blocked even with the right password.');
  }

  if (password) {
    const ok = await user.verifyPassword(password);
    console.log(`\n[verify] password = "${password}"`);
    console.log(`[verify] ${ok ? '✅ MATCHES the stored hash' : '❌ does NOT match the stored hash'}`);
  } else {
    console.log('\n[hint  ] Pass the password as the 2nd argument to test it:');
    console.log('         node scripts/debug-login.js <email> <password>');
  }

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
