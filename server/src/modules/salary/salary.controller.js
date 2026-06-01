const asyncHandler = require('express-async-handler');
const SalaryHistory = require('../../models/SalaryHistory');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');

// GET /api/salary/history?employeeId=...
const listHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) throw new ApiError(400, 'employeeId is required');
  const rows = await SalaryHistory.find({ company: req.user.company, employee: employeeId })
    .sort({ effectiveFrom: -1 });
  res.json({ history: rows });
});

// POST /api/salary/history
// Body: { employee, effectiveFrom, ctc, basic, components, reason }
// Also updates the live snapshot on Employee.
const addHistory = asyncHandler(async (req, res) => {
  const { employee: employeeId, effectiveFrom, ctc, basic, components, reason } = req.body;
  if (!employeeId) throw new ApiError(400, 'employee is required');
  if (!effectiveFrom) throw new ApiError(400, 'effectiveFrom is required');

  const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');

  const row = await SalaryHistory.create({
    company: req.user.company,
    employee: emp._id,
    effectiveFrom: new Date(effectiveFrom),
    ctc,
    basic,
    components: components || [],
    reason: reason || 'REVISION',
    changedBy: req.user._id,
  });

  // Update current snapshot on Employee
  if (ctc !== undefined) emp.ctc = ctc;
  if (basic !== undefined) emp.basicSalary = basic;
  if (components) emp.salaryStructure = components;
  await emp.save();

  res.status(201).json({ history: row, employee: emp });
});

module.exports = { listHistory, addHistory };
