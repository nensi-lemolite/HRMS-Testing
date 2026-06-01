const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    country: { type: String, enum: ['IN', 'QA'], required: true },
    date: { type: Date, required: true, index: true },     // 00:00 of the day
    checkIn: Date,
    checkOut: Date,
    hours: Number,
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'WEEKLY_OFF', 'HOLIDAY', 'ON_LEAVE'], default: 'PRESENT' },
    timezone: String,
    notes: String,
  },
  { timestamps: true }
);

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
