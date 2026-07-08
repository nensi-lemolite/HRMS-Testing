const asyncHandler = require('express-async-handler');
const ExitChecklist = require('../../models/ExitChecklist');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');

// GET /api/exit            -> list every offboarding for the company
// GET /api/exit?employeeId= -> the single checklist for that employee
const getForEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.query;
  const empFields = 'name empCode designation department status exitDate';

  if (employeeId) {
    const checklist = await ExitChecklist.findOne({ company: req.user.company, employee: employeeId })
      .populate('employee', empFields);
    return res.json({ checklist: checklist || null });
  }

  const checklists = await ExitChecklist.find({ company: req.user.company })
    .populate('employee', empFields)
    .sort({ updatedAt: -1 });
  res.json({ checklists });
});

// POST /api/exit  (upsert by employee)
const upsert = asyncHandler(async (req, res) => {
  const { employee: employeeId } = req.body;
  if (!employeeId) throw new ApiError(400, 'employee is required');
  const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');

  const existing = await ExitChecklist.findOne({ employee: emp._id });
  if (existing) {
    const { employee: _ignore, company: _c, ...patch } = req.body;
    Object.assign(existing, patch);
    await existing.save();
    return res.json({ checklist: existing });
  }

  const checklist = await ExitChecklist.create({
    ...req.body,
    company: req.user.company,
    employee: emp._id,
  });
  res.status(201).json({ checklist });
});

// PATCH /api/exit/:id
const update = asyncHandler(async (req, res) => {
  const checklist = await ExitChecklist.findOne({ _id: req.params.id, company: req.user.company });
  if (!checklist) throw new ApiError(404, 'Exit checklist not found');
  Object.assign(checklist, req.body);
  await checklist.save();
  res.json({ checklist });
});

// DELETE /api/exit/:id
const remove = asyncHandler(async (req, res) => {
  const checklist = await ExitChecklist.findOne({ _id: req.params.id, company: req.user.company });
  if (!checklist) throw new ApiError(404, 'Exit checklist not found');
  await ExitChecklist.deleteOne({ _id: checklist._id });
  res.json({ deleted: true, id: checklist._id });
});

module.exports = { getForEmployee, upsert, update, remove };
