const mongoose = require('mongoose');

const BonusTierSchema = new mongoose.Schema(
  {
    level: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ReferralPolicySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    text: { type: String, default: '' },
    bonusTiers: { type: [BonusTierSchema], default: [] },
    currency: { type: String, default: 'INR' },
    eligibility: { type: String, default: '' },
    payoutCondition: { type: String, default: 'Bonus is paid once the referred candidate completes their first 90 days.' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReferralPolicy', ReferralPolicySchema);
