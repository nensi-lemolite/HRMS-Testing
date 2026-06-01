const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    year: { type: Number, required: true },
    country: { type: String, enum: ['IN', 'QA'], required: true },
    balances: {
      type: Map,
      of: Number,
      default: {},   // { CL: 12, SL: 7, EL: 18 } or { AL: 21, SL: 14 }
    },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', LeaveBalanceSchema);
