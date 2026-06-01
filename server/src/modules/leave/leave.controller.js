const asyncHandler = require('express-async-handler');
const Leave = require('../../models/Leave');
const LeaveBalance = require('../../models/LeaveBalance');
const LeaveType = require('../../models/LeaveType');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');

function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function dayDiff(from, to) {
  const ms = startOfDay(to) - startOfDay(from);
  return Math.floor(ms / 86400000) + 1;
}

async function getCompanyLeaveTypes(companyId) {
  return LeaveType.find({ company: companyId, isActive: true }).sort({ code: 1 });
}

async function getOrInitBalance(employee, year) {
  let bal = await LeaveBalance.findOne({ employee: employee._id, year });
  const companyTypes = await getCompanyLeaveTypes(employee.company);

  if (!bal) {
    const balances = {};
    companyTypes.forEach((t) => { balances[t.code] = t.annualQuota; });
    bal = await LeaveBalance.create({
      employee: employee._id,
      year,
      country: employee.country,
      balances,
    });
  } else {
    // Sync — add any new company types that didn't exist yet
    let dirty = false;
    companyTypes.forEach((t) => {
      if (!bal.balances.has(t.code)) { bal.balances.set(t.code, t.annualQuota); dirty = true; }
    });
    if (dirty) await bal.save();
  }
  return bal;
}

// GET /api/leave/types
const types = asyncHandler(async (req, res) => {
  const list = await getCompanyLeaveTypes(req.user.company);
  res.json({ types: list });
});

// GET /api/leave/balance/me
const myBalance = asyncHandler(async (req, res) => {
  if (!req.user.employee) return res.json({ balance: null });
  const employee = await Employee.findById(req.user.employee);
  const year = new Date().getFullYear();
  const bal = await getOrInitBalance(employee, year);
  res.json({ balance: bal });
});

// POST /api/leave/apply
const apply = asyncHandler(async (req, res) => {
  if (!req.user.employee) throw new ApiError(400, 'No employee record linked to your account');
  const employee = await Employee.findById(req.user.employee);

  const { type, from, to, reason } = req.body;
  if (!type || !from || !to) throw new ApiError(400, 'type, from, to are required');

  const days = dayDiff(new Date(from), new Date(to));
  if (days <= 0) throw new ApiError(400, 'Invalid date range');

  const allowed = await LeaveType.findOne({ company: employee.company, code: type.toUpperCase(), isActive: true });
  if (!allowed) throw new ApiError(400, `Leave type ${type} not allowed`);

  const year = new Date(from).getFullYear();
  const bal = await getOrInitBalance(employee, year);
  const available = bal.balances.get(allowed.code) ?? 0;
  if (days > available) throw new ApiError(400, `Insufficient balance — ${available} day(s) of ${allowed.code} remaining`);

  const leave = await Leave.create({
    employee: employee._id,
    company: employee.company,
    country: employee.country,
    type: allowed.code, from, to, days, reason,
    status: 'PENDING',
  });
  res.status(201).json({ leave });
});

const myList = asyncHandler(async (req, res) => {
  if (!req.user.employee) return res.json({ leaves: [] });
  const leaves = await Leave.find({ employee: req.user.employee }).sort({ createdAt: -1 });
  res.json({ leaves });
});

const pending = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({ company: req.user.company, status: 'PENDING' })
    .sort({ createdAt: -1 })
    .populate('employee', 'name empCode department designation');
  res.json({ leaves });
});

const listAll = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({ company: req.user.company })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('employee', 'name empCode department');
  res.json({ leaves });
});

const decide = asyncHandler(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, company: req.user.company });
  if (!leave) throw new ApiError(404, 'Leave not found');
  if (leave.status !== 'PENDING') throw new ApiError(400, 'Already decided');

  const { decision, note } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ApiError(400, 'Invalid decision');

  leave.status = decision;
  leave.approver = req.user._id;
  leave.decidedAt = new Date();
  leave.decisionNote = note;
  await leave.save();

  if (decision === 'APPROVED') {
    const employee = await Employee.findById(leave.employee);
    const year = new Date(leave.from).getFullYear();
    const bal = await getOrInitBalance(employee, year);
    const cur = bal.balances.get(leave.type) ?? 0;
    bal.balances.set(leave.type, Math.max(0, cur - leave.days));
    await bal.save();
  }
  res.json({ leave });
});

// GET /api/leave/employee/:empId
const employeeLeaves = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.empId, company: req.user.company });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const year = new Date().getFullYear();
  const bal = await getOrInitBalance(employee, year);
  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 });
  res.json({ leaves, balance: bal });
});

// ----- Leave type management (admin) -----

// GET /api/leave/types-admin
const listTypesAdmin = asyncHandler(async (req, res) => {
  const list = await LeaveType.find({ company: req.user.company }).sort({ code: 1 });
  res.json({ types: list });
});

// POST /api/leave/types-admin
const createType = asyncHandler(async (req, res) => {
  const { code, name, annualQuota, carryForward, description } = req.body;
  if (!code || !name) throw new ApiError(400, 'code and name are required');
  const cleanCode = String(code).toUpperCase().trim();

  const exists = await LeaveType.findOne({ company: req.user.company, code: cleanCode });
  if (exists) throw new ApiError(409, 'A leave type with this code already exists');

  const type = await LeaveType.create({
    company: req.user.company,
    code: cleanCode,
    name,
    annualQuota: Number(annualQuota) || 0,
    carryForward: Number(carryForward) || 0,
    description: description || '',
    isActive: true,
  });
  res.status(201).json({ type });
});

// PATCH /api/leave/types-admin/:id
const updateType = asyncHandler(async (req, res) => {
  const type = await LeaveType.findOne({ _id: req.params.id, company: req.user.company });
  if (!type) throw new ApiError(404, 'Leave type not found');

  if (req.body.name !== undefined) type.name = req.body.name;
  if (req.body.annualQuota !== undefined) type.annualQuota = Number(req.body.annualQuota) || 0;
  if (req.body.carryForward !== undefined) type.carryForward = Number(req.body.carryForward) || 0;
  if (req.body.description !== undefined) type.description = req.body.description;
  if (typeof req.body.isActive === 'boolean') type.isActive = req.body.isActive;
  await type.save();
  res.json({ type });
});

// DELETE /api/leave/types-admin/:id
const deleteType = asyncHandler(async (req, res) => {
  const type = await LeaveType.findOne({ _id: req.params.id, company: req.user.company });
  if (!type) throw new ApiError(404, 'Leave type not found');
  const usedCount = await Leave.countDocuments({ company: req.user.company, type: type.code });
  if (usedCount > 0) {
    type.isActive = false;
    await type.save();
    return res.json({ deactivated: true, type });
  }
  await LeaveType.deleteOne({ _id: type._id });
  res.json({ deleted: true });
});

module.exports = {
  types, myBalance, apply, myList, pending, listAll, decide, employeeLeaves,
  listTypesAdmin, createType, updateType, deleteType,
};
