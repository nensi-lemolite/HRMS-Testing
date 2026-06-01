const asyncHandler = require('express-async-handler');
const PayrollRun = require('../../models/PayrollRun');
const Payslip = require('../../models/Payslip');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');
const { getCountryProfile } = require('../../countries');

function defaultStructureFor(country) {
  if (country === 'IN') return [
    { code: 'basic', label: 'Basic', amount: 30000 },
    { code: 'hra', label: 'HRA', amount: 12000 },
    { code: 'special', label: 'Special Allowance', amount: 6000 },
    { code: 'lta', label: 'LTA', amount: 2000 },
  ];
  return [
    { code: 'basic', label: 'Basic', amount: 5000 },
    { code: 'housing', label: 'Housing', amount: 2000 },
    { code: 'transport', label: 'Transport', amount: 500 },
    { code: 'other', label: 'Other', amount: 0 },
  ];
}

function componentsFromStructure(structure) {
  const out = {};
  (structure || []).forEach((c) => { out[c.code] = c.amount; });
  return out;
}

// GET /api/payroll/runs?country=IN
const listRuns = asyncHandler(async (req, res) => {
  const filter = { company: req.user.company };
  if (req.query.country) filter.country = req.query.country;
  const runs = await PayrollRun.find(filter).sort({ period: -1 });
  res.json({ runs });
});

// POST /api/payroll/runs  body: { period: 'YYYY-MM', country: 'IN' }
const createRun = asyncHandler(async (req, res) => {
  const { period, country } = req.body;
  if (!/^\d{4}-\d{2}$/.test(period)) throw new ApiError(400, 'period must be YYYY-MM');
  const ctry = (country || req.user.country).toUpperCase();

  const exists = await PayrollRun.findOne({ company: req.user.company, country: ctry, period });
  if (exists) throw new ApiError(409, 'Payroll already exists for this period');

  const profile = getCountryProfile(ctry);
  const employees = await Employee.find({ company: req.user.company, country: ctry, status: 'ACTIVE' });

  const run = await PayrollRun.create({
    company: req.user.company,
    country: ctry,
    period,
    status: 'DRAFT',
    runBy: req.user._id,
  });

  let totalGross = 0, totalDeduct = 0, totalNet = 0;
  for (const emp of employees) {
    const structure = emp.salaryStructure?.length ? emp.salaryStructure : defaultStructureFor(ctry);
    const result = profile.payrollRules.computePayslip({ components: componentsFromStructure(structure) });
    const slip = await Payslip.create({
      payrollRun: run._id,
      employee: emp._id,
      country: ctry,
      period,
      earnings: result.earnings,
      deductions: result.deductions,
      gross: result.gross,
      totalDeduction: result.totalDeduction,
      net: result.net,
      extras: result.eosAccrual ? { eosAccrual: result.eosAccrual } : {},
    });
    totalGross += slip.gross;
    totalDeduct += slip.totalDeduction;
    totalNet += slip.net;
  }
  run.totals = { gross: totalGross, deductions: totalDeduct, net: totalNet };
  await run.save();
  res.status(201).json({ run });
});

// GET /api/payroll/runs/:id
const getRun = asyncHandler(async (req, res) => {
  const run = await PayrollRun.findOne({ _id: req.params.id, company: req.user.company });
  if (!run) throw new ApiError(404, 'Payroll run not found');
  const payslips = await Payslip.find({ payrollRun: run._id }).populate('employee', 'name empCode department');
  res.json({ run, payslips });
});

// POST /api/payroll/runs/:id/finalize
const finalizeRun = asyncHandler(async (req, res) => {
  const run = await PayrollRun.findOne({ _id: req.params.id, company: req.user.company });
  if (!run) throw new ApiError(404, 'Payroll run not found');
  if (run.status !== 'DRAFT') throw new ApiError(400, 'Only DRAFT runs can be finalized');
  run.status = 'FINALIZED';
  run.finalizedAt = new Date();
  await run.save();
  res.json({ run });
});

// GET /api/payroll/payslips/me
const myPayslips = asyncHandler(async (req, res) => {
  if (!req.user.employee) return res.json({ payslips: [] });
  const payslips = await Payslip.find({ employee: req.user.employee }).sort({ period: -1 });
  res.json({ payslips });
});

// GET /api/payroll/payslips/employee/:empId
const employeePayslips = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.empId, company: req.user.company });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const payslips = await Payslip.find({ employee: employee._id }).sort({ period: -1 });
  res.json({ payslips });
});

module.exports = { listRuns, createRun, getRun, finalizeRun, myPayslips, employeePayslips };
