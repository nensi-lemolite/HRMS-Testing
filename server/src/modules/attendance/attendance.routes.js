const express = require('express');
const { authenticate, requirePerm } = require('../../middleware/auth');
const { checkIn, checkOut, todayMine, myHistory, teamToday, employeeHistory } = require('./attendance.controller');

const router = express.Router();
router.use(authenticate);

router.post('/checkin', requirePerm('attendance.mark.self'), checkIn);
router.post('/checkout', requirePerm('attendance.mark.self'), checkOut);
router.get('/today', requirePerm('attendance.mark.self'), todayMine);
router.get('/me', requirePerm('attendance.mark.self'), myHistory);
router.get('/team', requirePerm('attendance.read.all'), teamToday);
router.get('/employee/:empId', requirePerm('attendance.read.all'), employeeHistory);

module.exports = router;
