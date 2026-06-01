const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const {
  list,
  get,
  create,
  update,
  remove,
  getPolicy,
  updatePolicy,
  stats,
} = require('./referral.controller');

const router = express.Router();
router.use(authenticate);

// Policy (any authenticated user can read it)
router.get('/policy', getPolicy);
router.put('/policy', requirePerm('referrals.policy.write'), updatePolicy);

// Stats (HR/Admin)
router.get('/stats', requirePerm('referrals.read.all'), stats);

// Referrals
router.get('/', list);
router.get('/:id', get);
router.post('/', requirePerm('referrals.refer'), create);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
