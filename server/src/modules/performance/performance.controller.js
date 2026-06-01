const asyncHandler = require('express-async-handler');
const Goal = require('../../models/Goal');
const AppraisalReview = require('../../models/AppraisalReview');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');

function canSeeAll(req) {
  return (req.permissions || []).includes('performance.read.all');
}
function isOwnEmployee(req, employeeId) {
  return req.user.employee && String(req.user.employee) === String(employeeId);
}

function gateRead(req, employeeId) {
  if (!employeeId) throw new ApiError(400, 'employeeId is required');
  if (!canSeeAll(req) && !isOwnEmployee(req, employeeId)) {
    throw new ApiError(403, 'Forbidden');
  }
}

// ----- Goals -----

// GET /api/performance/goals?employeeId=...
const listGoals = asyncHandler(async (req, res) => {
  gateRead(req, req.query.employeeId);
  const goals = await Goal.find({ company: req.user.company, employee: req.query.employeeId })
    .sort({ createdAt: -1 });
  res.json({ goals });
});

// POST /api/performance/goals
const createGoal = asyncHandler(async (req, res) => {
  const { employee: employeeId } = req.body;
  const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');
  const goal = await Goal.create({ ...req.body, company: req.user.company, employee: emp._id });
  res.status(201).json({ goal });
});

// PATCH /api/performance/goals/:id
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, company: req.user.company });
  if (!goal) throw new ApiError(404, 'Goal not found');
  Object.assign(goal, req.body);
  await goal.save();
  res.json({ goal });
});

// DELETE /api/performance/goals/:id
const removeGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, company: req.user.company });
  if (!goal) throw new ApiError(404, 'Goal not found');
  await Goal.deleteOne({ _id: goal._id });
  res.json({ deleted: true, id: goal._id });
});

// ----- Appraisals -----

// GET /api/performance/appraisals?employeeId=...
const listAppraisals = asyncHandler(async (req, res) => {
  gateRead(req, req.query.employeeId);
  const appraisals = await AppraisalReview.find({
    company: req.user.company,
    employee: req.query.employeeId,
  }).sort({ period: -1 });
  res.json({ appraisals });
});

// POST /api/performance/appraisals
const createAppraisal = asyncHandler(async (req, res) => {
  const { employee: employeeId, period } = req.body;
  if (!period) throw new ApiError(400, 'period is required');
  const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');
  const existing = await AppraisalReview.findOne({ employee: emp._id, period });
  if (existing) throw new ApiError(409, `Appraisal for ${period} already exists`);
  const appraisal = await AppraisalReview.create({
    ...req.body,
    company: req.user.company,
    employee: emp._id,
    reviewer: req.user._id,
    reviewedAt: new Date(),
  });
  res.status(201).json({ appraisal });
});

// PATCH /api/performance/appraisals/:id
const updateAppraisal = asyncHandler(async (req, res) => {
  const appraisal = await AppraisalReview.findOne({ _id: req.params.id, company: req.user.company });
  if (!appraisal) throw new ApiError(404, 'Appraisal not found');
  Object.assign(appraisal, req.body);
  if (req.body.status === 'FINALIZED' && !appraisal.reviewedAt) appraisal.reviewedAt = new Date();
  await appraisal.save();
  res.json({ appraisal });
});

// DELETE /api/performance/appraisals/:id
const removeAppraisal = asyncHandler(async (req, res) => {
  const appraisal = await AppraisalReview.findOne({ _id: req.params.id, company: req.user.company });
  if (!appraisal) throw new ApiError(404, 'Appraisal not found');
  await AppraisalReview.deleteOne({ _id: appraisal._id });
  res.json({ deleted: true, id: appraisal._id });
});

module.exports = {
  listGoals, createGoal, updateGoal, removeGoal,
  listAppraisals, createAppraisal, updateAppraisal, removeAppraisal,
};
