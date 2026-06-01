const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    country: { type: String, enum: ['IN', 'QA'], required: true },
    type: { type: String, required: true },    // CL, SL, EL, AL, ML, ...
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: String,
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    decisionNote: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', LeaveSchema);
