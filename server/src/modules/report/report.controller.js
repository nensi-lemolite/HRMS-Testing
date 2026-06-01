const asyncHandler = require('express-async-handler');
const Employee = require('../../models/Employee');
const Attendance = require('../../models/Attendance');
const Leave = require('../../models/Leave');
const PayrollRun = require('../../models/PayrollRun');

function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}

// GET /api/reports/overview
const overview = asyncHandler(async (req, res) => {
  const company = req.user.company;
  const total = await Employee.countDocuments({ company });
  const active = await Employee.countDocuments({ company, status: 'ACTIVE' });
  const onNotice = await Employee.countDocuments({ company, status: 'ON_NOTICE' });
  const exited = await Employee.countDocuments({ company, status: 'EXITED' });

  const today = startOfDay();
  const presentToday = await Attendance.countDocuments({ company, date: today, status: 'PRESENT' });

  const pendingLeaves = await Leave.countDocuments({ company, status: 'PENDING' });
  const approvedThisMonth = await Leave.countDocuments({
    company,
    status: 'APPROVED',
    decidedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  });

  const byDepartment = await Employee.aggregate([
    { $match: { company } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const recentRuns = await PayrollRun.find({ company }).sort({ period: -1 }).limit(6);

  res.json({
    headcount: { total, active, onNotice, exited },
    attendance: { presentToday },
    leave: { pending: pendingLeaves, approvedThisMonth },
    byDepartment: byDepartment.map((d) => ({ department: d._id || 'Unassigned', count: d.count })),
    recentRuns,
  });
});

// GET /api/reports/attendance-trend?days=30
const attendanceTrend = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 90);
  const from = startOfDay();
  from.setDate(from.getDate() - days + 1);

  const rows = await Attendance.aggregate([
    { $match: { company: req.user.company, date: { $gte: from } } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] } },
    }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ days, rows });
});

module.exports = { overview, attendanceTrend };
