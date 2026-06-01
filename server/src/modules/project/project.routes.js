const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { list, get, create, update, remove } = require('./project.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', requirePerm('projects.read'), list);
router.get('/:id', requirePerm('projects.read'), get);
router.post('/', requirePerm('projects.write'), create);
router.patch('/:id', requirePerm('projects.write'), update);
router.delete('/:id', requirePerm('projects.write'), remove);

module.exports = router;
