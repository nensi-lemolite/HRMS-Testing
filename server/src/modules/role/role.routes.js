const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { catalog, listUsers, updateUser, createRole, updateRole, deleteRole } = require('./role.controller');

const router = express.Router();
router.use(authenticate);

router.get('/catalog', requirePerm('roles.read'), catalog);
router.get('/users', requirePerm('roles.read'), listUsers);
router.patch('/users/:id', requirePerm('roles.write'), updateUser);

router.post('/', requirePerm('roles.write'), createRole);
router.patch('/:id', requirePerm('roles.write'), updateRole);
router.delete('/:id', requirePerm('roles.write'), deleteRole);

module.exports = router;
