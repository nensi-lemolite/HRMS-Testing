const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { getForEmployee, upsert, update, remove } = require('./exit.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', requirePerm('exit.read.all'), getForEmployee);
router.post('/', requirePerm('exit.write'), upsert);
router.patch('/:id', requirePerm('exit.write'), update);
router.delete('/:id', requirePerm('exit.write'), remove);

module.exports = router;
