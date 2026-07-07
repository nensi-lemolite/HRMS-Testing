const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    rewardKey: { type: String, required: true },
    name: String,
    cost: Number,
  },
  { timestamps: true }
);

RedemptionSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Redemption', RedemptionSchema);
