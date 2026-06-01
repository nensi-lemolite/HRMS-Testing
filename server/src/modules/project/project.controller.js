const asyncHandler = require('express-async-handler');
const Project = require('../../models/Project');
const ApiError = require('../../utils/ApiError');

// GET /api/projects
const list = asyncHandler(async (req, res) => {
  const filter = { company: req.user.company };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.memberId) filter.members = req.query.memberId;
  const projects = await Project.find(filter).sort({ createdAt: -1 });
  res.json({ projects });
});

// GET /api/projects/:id
const get = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company: req.user.company })
    .populate('members', 'empCode name designation');
  if (!project) throw new ApiError(404, 'Project not found');
  res.json({ project });
});

// POST /api/projects
const create = asyncHandler(async (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'name is required');
  const project = await Project.create({ ...req.body, company: req.user.company });
  res.status(201).json({ project });
});

// PATCH /api/projects/:id
const update = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company: req.user.company });
  if (!project) throw new ApiError(404, 'Project not found');
  Object.assign(project, req.body);
  await project.save();
  res.json({ project });
});

// DELETE /api/projects/:id
const remove = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company: req.user.company });
  if (!project) throw new ApiError(404, 'Project not found');
  await Project.deleteOne({ _id: project._id });
  res.json({ deleted: true, id: project._id });
});

module.exports = { list, get, create, update, remove };
