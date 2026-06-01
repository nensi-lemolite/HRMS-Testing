const express = require('express');
const { authenticate, requireRole, requirePerm } = require('../../middleware/auth');
const { resolveCountry } = require('../../middleware/countryResolver');
const { uploadPhoto } = require('../../middleware/upload');
const { list, get, create, update, remove, uploadProfilePhoto, resetPassword, updateAccess } = require('./employee.controller');

const router = express.Router();

router.use(authenticate, resolveCountry);

router.get('/', list);
router.get('/:id', get);
router.post('/', requireRole('SUPER_ADMIN', 'HR_ADMIN'), create);
router.patch('/:id', requireRole('SUPER_ADMIN', 'HR_ADMIN'), update);
router.delete('/:id', requireRole('SUPER_ADMIN', 'HR_ADMIN'), remove);
router.post(
  '/:id/photo',
  requireRole('SUPER_ADMIN', 'HR_ADMIN'),
  uploadPhoto.single('photo'),
  uploadProfilePhoto,
);
router.post(
  '/:id/reset-password',
  requireRole('SUPER_ADMIN', 'HR_ADMIN'),
  resetPassword,
);
router.patch('/:id/access', updateAccess);

module.exports = router;
