const mongoose = require('mongoose');

const LineSchema = new mongoose.Schema(
  { code: String, label: String, amount: Number },
  { _id: false }
);

const PayslipSchema = new mongoose.Schema(
  {
    payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    country: { type: String, enum: ['IN', 'QA'], required: true },
    period: { type: String, required: true },
    earnings: [LineSchema],
    deductions: [LineSchema],
    gross: Number,
    totalDeduction: Number,
    net: Number,
    extras: { type: mongoose.Schema.Types.Mixed, default: {} },  // e.g. { eosAccrual: 1234 } for Qatar
    pdfRef: String,
  },
  { timestamps: true }
);

PayslipSchema.index({ payrollRun: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', PayslipSchema);
