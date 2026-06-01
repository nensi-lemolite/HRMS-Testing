const mongoose = require('mongoose');

const PayrollRunSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    country: { type: String, enum: ['IN', 'QA'], required: true, index: true },
    period: { type: String, required: true },   // 'YYYY-MM'
    status: { type: String, enum: ['DRAFT', 'FINALIZED', 'PAID'], default: 'DRAFT' },
    totals: {
      gross: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
    runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: Date,
  },
  { timestamps: true }
);

PayrollRunSchema.index({ company: 1, country: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRun', PayrollRunSchema);
