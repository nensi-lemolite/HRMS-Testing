const express = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const {
  me,
  checkin,
  colleagues,
  kudos,
  award,
  leaderboard,
  badges,
  rewards,
  redeem,
  rules,
  updateConfig,
} = require('./gamification.controller');

const router = express.Router();
router.use(authenticate);

// Self-service (any authenticated employee)
router.get('/me', me);
router.post('/checkin', checkin);
router.get('/colleagues', colleagues);
router.post('/kudos', kudos);
router.post('/award', award);
router.get('/leaderboard', leaderboard);
router.get('/badges', badges);
router.get('/rewards', rewards);
router.post('/rewards/:key/redeem', redeem);

// Admin console
router.get('/rules', rules);
router.put('/config', requireRole('SUPER_ADMIN', 'HR_ADMIN'), updateConfig);

module.exports = router;
