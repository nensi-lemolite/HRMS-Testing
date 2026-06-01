const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const Document = require('../../models/Document');
const Employee = require('../../models/Employee');
const ApiError = require('../../utils/ApiError');
const { UPLOAD_ROOT, publicPath } = require('../../middleware/upload');

function canSeeAll(req) {
  return (req.permissions || []).includes('documents.read.all');
}

function isOwnEmployee(req, employeeId) {
  return req.user.employee && String(req.user.employee) === String(employeeId);
}

// GET /api/documents?employeeId=...
const list = asyncHandler(async (req, res) => {
  const { employeeId } = req.query;
  if (!employeeId) throw new ApiError(400, 'employeeId is required');

  if (!canSeeAll(req) && !isOwnEmployee(req, employeeId)) {
    throw new ApiError(403, 'Forbidden');
  }

  const docs = await Document.find({ company: req.user.company, employee: employeeId })
    .sort({ createdAt: -1 });
  res.json({ documents: docs });
});

// POST /api/documents  (multipart: file + employeeId, kind, label)
const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'file is required');
  const { employeeId, kind, label } = req.body;
  if (!employeeId) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, 'employeeId is required');
  }

  const employee = await Employee.findOne({ _id: employeeId, company: req.user.company });
  if (!employee) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(404, 'Employee not found');
  }

  const doc = await Document.create({
    company: req.user.company,
    employee: employee._id,
    kind: kind || 'OTHER',
    label: label || req.file.originalname,
    fileName: req.file.originalname,
    filePath: publicPath(req.file.path),
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ document: doc });
});

// DELETE /api/documents/:id
const remove = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, company: req.user.company });
  if (!doc) throw new ApiError(404, 'Document not found');

  // Remove the file from disk (best-effort)
  if (doc.filePath) {
    const rel = doc.filePath.replace(/^\/uploads\//, '');
    const abs = path.join(UPLOAD_ROOT, rel);
    fs.promises.unlink(abs).catch(() => {});
  }

  await Document.deleteOne({ _id: doc._id });
  res.json({ deleted: true, id: doc._id });
});

module.exports = { list, upload, remove };
