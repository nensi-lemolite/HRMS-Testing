const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const c = require('./performance.controller');

const router = express.Router();
router.use(authenticate);

router.get('/goals', c.listGoals);
router.post('/goals', requirePerm('performance.write'), c.createGoal);
router.patch('/goals/:id', requirePerm('performance.write'), c.updateGoal);
router.delete('/goals/:id', requirePerm('performance.write'), c.removeGoal);

router.get('/appraisals', c.listAppraisals);
router.post('/appraisals', requirePerm('performance.write'), c.createAppraisal);
router.patch('/appraisals/:id', requirePerm('performance.write'), c.updateAppraisal);
router.delete('/appraisals/:id', requirePerm('performance.write'), c.removeAppraisal);

module.exports = router;
