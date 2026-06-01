const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const c = require('./settings.controller');

const router = express.Router();
router.use(authenticate);

// Departments — anyone signed in may read (to fill dropdowns); only settings.write may edit.
router.get('/departments', c.listDepartments);
router.post('/departments', requirePerm('settings.write'), c.createDepartment);
router.patch('/departments/:id', requirePerm('settings.write'), c.updateDepartment);
router.delete('/departments/:id', requirePerm('settings.write'), c.removeDepartment);

// Designations
router.get('/designations', c.listDesignations);
router.post('/designations', requirePerm('settings.write'), c.createDesignation);
router.patch('/designations/:id', requirePerm('settings.write'), c.updateDesignation);
router.delete('/designations/:id', requirePerm('settings.write'), c.removeDesignation);

// Company policies — readable by every signed-in user; editable with settings.write.
router.get('/policies', c.listPolicies);
router.post('/policies', requirePerm('settings.write'), c.createPolicy);
router.patch('/policies/:id', requirePerm('settings.write'), c.updatePolicy);
router.delete('/policies/:id', requirePerm('settings.write'), c.removePolicy);

module.exports = router;
