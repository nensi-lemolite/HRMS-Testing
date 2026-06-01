const mongoose = require('mongoose');

const SalaryComponentSchema = new mongoose.Schema(
  {
    code: String,
    label: String,
    amount: Number,
  },
  { _id: false }
);

const SalaryHistorySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    effectiveFrom: { type: Date, required: true },
    ctc: Number,
    basic: Number,
    components: { type: [SalaryComponentSchema], default: [] },
    reason: { type: String, default: 'REVISION' }, // INITIAL, REVISION, PROMOTION, ADJUSTMENT
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SalaryHistorySchema.index({ employee: 1, effectiveFrom: -1 });

module.exports = mongoose.model('SalaryHistory', SalaryHistorySchema);
