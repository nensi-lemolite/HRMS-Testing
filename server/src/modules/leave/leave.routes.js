const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const {
  types, myBalance, apply, myList, pending, listAll, decide, employeeLeaves,
  listTypesAdmin, createType, updateType, deleteType,
} = require('./leave.controller');

const router = express.Router();
router.use(authenticate);

router.get('/types', types);
router.get('/balance/me', requirePerm('leave.apply'), myBalance);
router.post('/apply', requirePerm('leave.apply'), apply);
router.get('/my', requirePerm('leave.apply'), myList);

router.get('/pending', requirePerm('leave.approve.all'), pending);
router.get('/all', requirePerm('leave.read.all'), listAll);
router.patch('/:id/decide', requirePerm('leave.approve.all'), decide);
router.get('/employee/:empId', requirePerm('leave.read.all'), employeeLeaves);

// Admin leave-type management
router.get('/types-admin', requirePerm('leave.read.all'), listTypesAdmin);
router.post('/types-admin', requirePerm('leave.read.all'), createType);
router.patch('/types-admin/:id', requirePerm('leave.read.all'), updateType);
router.delete('/types-admin/:id', requirePerm('leave.read.all'), deleteType);

module.exports = router;
