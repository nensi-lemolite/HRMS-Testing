const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { listHistory, addHistory } = require('./salary.controller');

const router = express.Router();
router.use(authenticate);

router.get('/history', requirePerm('payroll.read.all'), listHistory);
router.post('/history', requirePerm('payroll.run'), addHistory);

module.exports = router;
