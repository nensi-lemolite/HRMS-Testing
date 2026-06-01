const asyncHandler = require('express-async-handler');
const Asset = require('../../models/Asset');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');

function canSeeAll(req) {
  return (req.permissions || []).includes('assets.read.all');
}
function isOwnEmployee(req, employeeId) {
  return req.user.employee && String(req.user.employee) === String(employeeId);
}

// GET /api/assets?employeeId=...&unassigned=1
const list = asyncHandler(async (req, res) => {
  const filter = { company: req.user.company };
  if (req.query.employeeId) {
    if (!canSeeAll(req) && !isOwnEmployee(req, req.query.employeeId)) {
      throw new ApiError(403, 'Forbidden');
    }
    filter.employee = req.query.employeeId;
  } else if (req.query.unassigned === '1') {
    // Inventory pool — assets not currently assigned to anyone
    filter.$or = [{ employee: null }, { status: 'AVAILABLE' }];
  } else if (!canSeeAll(req)) {
    if (!req.user.employee) return res.json({ assets: [] });
    filter.employee = req.user.employee;
  }
  const assets = await Asset.find(filter).sort({ createdAt: -1 });
  res.json({ assets });
});

// POST /api/assets
// Add an asset to inventory. Employee is OPTIONAL — when omitted, the asset is
// created with status=AVAILABLE and lives in the inventory pool until assigned.
const create = asyncHandler(async (req, res) => {
  const { employee: employeeId, ...rest } = req.body;

  const data = {
    ...rest,
    company: req.user.company,
    employee: null,
  };

  if (employeeId) {
    const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
    if (!emp) throw new ApiError(404, 'Employee not found');
    data.employee = emp._id;
    data.status = data.status || 'ASSIGNED';
    data.assignedAt = data.assignedAt || new Date();
  } else {
    data.status = 'AVAILABLE';
  }

  const asset = await Asset.create(data);
  res.status(201).json({ asset });
});

// POST /api/assets/:id/assign
// Body: { employee, assignedAt? }
// Take an existing AVAILABLE / RETURNED asset and assign it to an employee.
const assign = asyncHandler(async (req, res) => {
  const asset = await Asset.findOne({ _id: req.params.id, company: req.user.company });
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (asset.status === 'ASSIGNED') {
    throw new ApiError(409, 'Asset is already assigned. Return it first.');
  }
  const { employee: employeeId, assignedAt, notes, condition } = req.body;
  if (!employeeId) throw new ApiError(400, 'employee is required');

  const emp = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!emp) throw new ApiError(404, 'Employee not found');

  asset.employee = emp._id;
  asset.status = 'ASSIGNED';
  asset.assignedAt = assignedAt ? new Date(assignedAt) : new Date();
  asset.returnedAt = null;
  if (condition !== undefined) asset.condition = condition;
  if (notes !== undefined) asset.notes = notes;
  await asset.save();
  res.json({ asset });
});

// PATCH /api/assets/:id
const update = asyncHandler(async (req, res) => {
  const asset = await Asset.findOne({ _id: req.params.id, company: req.user.company });
  if (!asset) throw new ApiError(404, 'Asset not found');
  Object.assign(asset, req.body);
  if (req.body.status === 'RETURNED' && !asset.returnedAt) asset.returnedAt = new Date();
  // Returning to inventory: clear employee + assignment dates.
  if (req.body.status === 'AVAILABLE') {
    asset.employee = null;
    asset.assignedAt = null;
    asset.returnedAt = null;
  }
  await asset.save();
  res.json({ asset });
});

// DELETE /api/assets/:id
const remove = asyncHandler(async (req, res) => {
  const asset = await Asset.findOne({ _id: req.params.id, company: req.user.company });
  if (!asset) throw new ApiError(404, 'Asset not found');
  await Asset.deleteOne({ _id: asset._id });
  res.json({ deleted: true, id: asset._id });
});

module.exports = { list, create, assign, update, remove };
