const express = require('express');
const { registerCompany, login, me, changePassword } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.post('/register-company', registerCompany);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
