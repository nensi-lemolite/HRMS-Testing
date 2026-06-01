const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { list, create, assign, update, remove } = require('./asset.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', list);
router.post('/', requirePerm('assets.write'), create);
router.post('/:id/assign', requirePerm('assets.write'), assign);
router.patch('/:id', requirePerm('assets.write'), update);
router.delete('/:id', requirePerm('assets.write'), remove);

module.exports = router;
