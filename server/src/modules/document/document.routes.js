const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { uploadDocument } = require('../../middleware/upload');
const { list, upload, remove } = require('./document.controller');

const router = express.Router();
router.use(authenticate);

// Employees with .read.self can list their own; route handler enforces ownership.
router.get('/', list);
router.post('/', requirePerm('documents.write'), uploadDocument.single('file'), upload);
router.delete('/:id', requirePerm('documents.write'), remove);

module.exports = router;
