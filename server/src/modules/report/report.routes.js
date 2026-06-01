const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { overview, attendanceTrend } = require('./report.controller');

const router = express.Router();
router.use(authenticate);

router.get('/overview', requirePerm('reports.read.all'), overview);
router.get('/attendance-trend', requirePerm('reports.read.all'), attendanceTrend);

module.exports = router;
