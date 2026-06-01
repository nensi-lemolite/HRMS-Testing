const mongoose = require('mongoose');

const ExitChecklistSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    noticeStartDate: Date,
    lastWorkingDay: Date,
    exitInterview: {
      date: Date,
      notes: String,
      conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    clearance: {
      it: { type: Boolean, default: false },
      hr: { type: Boolean, default: false },
      finance: { type: Boolean, default: false },
      manager: { type: Boolean, default: false },
    },
    assetReturnStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'COMPLETE'],
      default: 'PENDING',
    },
    finalSettlementAmount: Number,
    finalSettlementDate: Date,
    status: {
      type: String,
      enum: ['INITIATED', 'IN_PROGRESS', 'CLEARED', 'SETTLED'],
      default: 'INITIATED',
    },
    reason: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExitChecklist', ExitChecklistSchema);
