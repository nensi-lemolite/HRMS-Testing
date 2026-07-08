const mongoose = require('mongoose');

const EarnSchema = new mongoose.Schema(
  {
    event: { type: String, required: true }, // e.g. CHECKIN
    label: String,
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    cap: { type: String, default: '—' },
    on: { type: Boolean, default: true },
  },
  { _id: false }
);

const RewardSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    emoji: { type: String, default: '🎁' },
    name: { type: String, required: true },
    cost: { type: Number, default: 0 },
    stock: { type: Number, default: null }, // null = unlimited
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const GamificationConfigSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    earning: { type: [EarnSchema], default: [] },
    rewards: { type: [RewardSchema], default: [] },
    budget: { type: String, default: '₹25,000' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GamificationConfig', GamificationConfigSchema);
