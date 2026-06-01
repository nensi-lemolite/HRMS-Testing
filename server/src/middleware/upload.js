const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const PHOTO_DIR = path.join(UPLOAD_ROOT, 'photos');
const DOC_DIR = path.join(UPLOAD_ROOT, 'documents');

for (const dir of [UPLOAD_ROOT, PHOTO_DIR, DOC_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const stem = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 40);
  const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return `${stem || 'file'}-${stamp}${ext}`;
}

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PHOTO_DIR),
  filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
});

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOC_DIR),
  filename: (_req, file, cb) => cb(null, safeName(file.originalname)),
});

const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function fileFilter(allowed) {
  return (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, `File type ${file.mimetype} not allowed`));
  };
}

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: fileFilter(PHOTO_TYPES),
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: fileFilter(DOCUMENT_TYPES),
});

function publicPath(absolutePath) {
  const rel = path.relative(UPLOAD_ROOT, absolutePath).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

module.exports = {
  uploadPhoto,
  uploadDocument,
  publicPath,
  UPLOAD_ROOT,
  PHOTO_DIR,
  DOC_DIR,
};
