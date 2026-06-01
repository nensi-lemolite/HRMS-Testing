const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { listRuns, createRun, getRun, finalizeRun, myPayslips, employeePayslips } = require('./payroll.controller');

const router = express.Router();
router.use(authenticate);

router.get('/runs', requirePerm('payroll.read.all'), listRuns);
router.post('/runs', requirePerm('payroll.run'), createRun);
router.get('/runs/:id', requirePerm('payroll.read.all'), getRun);
router.post('/runs/:id/finalize', requirePerm('payroll.run'), finalizeRun);

router.get('/payslips/me', requirePerm('payroll.read.self'), myPayslips);
router.get('/payslips/employee/:empId', requirePerm('payroll.read.all'), employeePayslips);

module.exports = router;
