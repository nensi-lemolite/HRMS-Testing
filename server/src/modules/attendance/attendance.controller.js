const asyncHandler = require('express-async-handler');
const Attendance = require('../../models/Attendance');
const Employee = require('../../models/Employee');
const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');
const { isAttendanceExempt } = require('../../utils/attendanceExempt');

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function resolveEmployee(user) {
  if (!user.employee) {
    // Allow admins without an Employee record to mark — auto-create a self employee.
    return null;
  }
  return Employee.findById(user.employee);
}

// POST /api/attendance/checkin
const checkIn = asyncHandler(async (req, res) => {
  if (isAttendanceExempt(req.user)) {
    throw new ApiError(403, 'Super admins are exempt from attendance');
  }
  const employee = await resolveEmployee(req.user);
  if (!employee) throw new ApiError(400, 'No employee record linked to your account');

  const today = startOfDay();
  let entry = await Attendance.findOne({ employee: employee._id, date: today });
  if (entry && entry.checkIn) {
    throw new ApiError(409, 'Already checked in today');
  }
  if (!entry) {
    entry = new Attendance({
      employee: employee._id,
      company: employee.company,
      country: employee.country,
      date: today,
    });
  }
  entry.checkIn = new Date();
  entry.status = 'PRESENT';
  await entry.save();
  res.status(201).json({ attendance: entry });
});

// POST /api/attendance/checkout
const checkOut = asyncHandler(async (req, res) => {
  if (isAttendanceExempt(req.user)) {
    throw new ApiError(403, 'Super admins are exempt from attendance');
  }
  const employee = await resolveEmployee(req.user);
  if (!employee) throw new ApiError(400, 'No employee record linked to your account');

  const today = startOfDay();
  const entry = await Attendance.findOne({ employee: employee._id, date: today });
  if (!entry || !entry.checkIn) throw new ApiError(400, 'Not checked in yet');
  if (entry.checkOut) throw new ApiError(409, 'Already checked out');

  entry.checkOut = new Date();
  entry.hours = Math.round(((entry.checkOut - entry.checkIn) / 36e5) * 100) / 100;
  await entry.save();
  res.json({ attendance: entry });
});

// GET /api/attendance/today
const todayMine = asyncHandler(async (req, res) => {
  if (isAttendanceExempt(req.user)) return res.json({ entry: null, exempt: true });
  const employee = await resolveEmployee(req.user);
  if (!employee) return res.json({ entry: null });
  const entry = await Attendance.findOne({ employee: employee._id, date: startOfDay() });
  res.json({ entry });
});

// GET /api/attendance/me  (history)
const myHistory = asyncHandler(async (req, res) => {
  if (isAttendanceExempt(req.user)) return res.json({ entries: [], exempt: true });
  const employee = await resolveEmployee(req.user);
  if (!employee) return res.json({ entries: [] });
  const entries = await Attendance.find({ employee: employee._id })
    .sort({ date: -1 })
    .limit(60);
  res.json({ entries });
});

// GET /api/attendance/team?date=YYYY-MM-DD
const teamToday = asyncHandler(async (req, res) => {
  const date = req.query.date ? startOfDay(new Date(req.query.date)) : startOfDay();
  const allEmployees = await Employee.find({ company: req.user.company, status: 'ACTIVE' })
    .select('empCode name department designation country');

  const adminEmpIds = await User.find({
    company: req.user.company,
    role: 'SUPER_ADMIN',
    employee: { $ne: null },
  }).distinct('employee');
  const adminSet = new Set(adminEmpIds.map(String));
  const employees = allEmployees.filter((e) => !adminSet.has(String(e._id)));

  const entries = await Attendance.find({
    company: req.user.company,
    date,
    employee: { $in: employees.map((e) => e._id) },
  });
  const map = new Map(entries.map((e) => [String(e.employee), e]));

  const rows = employees.map((emp) => ({
    employee: emp,
    entry: map.get(String(emp._id)) || null,
  }));
  res.json({ date, rows });
});

// GET /api/attendance/employee/:empId
const employeeHistory = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.empId, company: req.user.company });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const linkedAdmin = await User.exists({
    company: req.user.company,
    role: 'SUPER_ADMIN',
    employee: employee._id,
  });
  if (linkedAdmin) return res.json({ entries: [], exempt: true });
  const entries = await Attendance.find({ employee: employee._id })
    .sort({ date: -1 })
    .limit(60);
  res.json({ entries });
});

module.exports = { checkIn, checkOut, todayMine, myHistory, teamToday, employeeHistory };
