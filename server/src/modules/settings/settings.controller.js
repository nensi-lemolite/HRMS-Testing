const asyncHandler = require('express-async-handler');
const OrgUnit = require('../../models/OrgUnit');
const CompanyPolicy = require('../../models/CompanyPolicy');
const ApiError = require('../../utils/ApiError');

// ---------- Departments & Designations (OrgUnit) ----------

function orgList(type) {
  return asyncHandler(async (req, res) => {
    const items = await OrgUnit.find({ company: req.user.company, type })
      .sort({ name: 1 })
      .lean();
    res.json({ items });
  });
}

function orgCreate(type) {
  return asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) throw new ApiError(400, 'Name is required');
    const exists = await OrgUnit.findOne({ company: req.user.company, type, name });
    if (exists) throw new ApiError(409, 'That entry already exists');
    const item = await OrgUnit.create({ company: req.user.company, type, name });
    res.status(201).json({ item });
  });
}

function orgUpdate(type) {
  return asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) throw new ApiError(400, 'Name is required');
    const item = await OrgUnit.findOne({ _id: req.params.id, company: req.user.company, type });
    if (!item) throw new ApiError(404, 'Not found');
    const clash = await OrgUnit.findOne({
      company: req.user.company,
      type,
      name,
      _id: { $ne: item._id },
    });
    if (clash) throw new ApiError(409, 'That entry already exists');
    item.name = name;
    await item.save();
    res.json({ item });
  });
}

function orgRemove(type) {
  return asyncHandler(async (req, res) => {
    const item = await OrgUnit.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
      type,
    });
    if (!item) throw new ApiError(404, 'Not found');
    res.json({ deleted: true });
  });
}

// ---------- Company Policies ----------

const listPolicies = asyncHandler(async (req, res) => {
  const items = await CompanyPolicy.find({ company: req.user.company })
    .sort({ title: 1 })
    .lean();
  res.json({ items });
});

const createPolicy = asyncHandler(async (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) throw new ApiError(400, 'Title is required');
  const item = await CompanyPolicy.create({
    company: req.user.company,
    title,
    body: req.body.body || '',
  });
  res.status(201).json({ item });
});

const updatePolicy = asyncHandler(async (req, res) => {
  const item = await CompanyPolicy.findOne({ _id: req.params.id, company: req.user.company });
  if (!item) throw new ApiError(404, 'Policy not found');
  if (req.body.title !== undefined) {
    const title = req.body.title.trim();
    if (!title) throw new ApiError(400, 'Title is required');
    item.title = title;
  }
  if (req.body.body !== undefined) item.body = req.body.body;
  await item.save();
  res.json({ item });
});

const removePolicy = asyncHandler(async (req, res) => {
  const item = await CompanyPolicy.findOneAndDelete({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!item) throw new ApiError(404, 'Policy not found');
  res.json({ deleted: true });
});

module.exports = {
  listDepartments: orgList('DEPARTMENT'),
  createDepartment: orgCreate('DEPARTMENT'),
  updateDepartment: orgUpdate('DEPARTMENT'),
  removeDepartment: orgRemove('DEPARTMENT'),
  listDesignations: orgList('DESIGNATION'),
  createDesignation: orgCreate('DESIGNATION'),
  updateDesignation: orgUpdate('DESIGNATION'),
  removeDesignation: orgRemove('DESIGNATION'),
  listPolicies,
  createPolicy,
  updatePolicy,
  removePolicy,
};
