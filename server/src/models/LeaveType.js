const mongoose = require('mongoose');

const LeaveTypeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    annualQuota: { type: Number, required: true, default: 0, min: 0 },
    carryForward: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

LeaveTypeSchema.index({ company: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('LeaveType', LeaveTypeSchema);
