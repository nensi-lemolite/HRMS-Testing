const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    type: String,
    label: String,
    xp: Number,
    coins: Number,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GamificationProfileSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },

    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastCheckin: { type: Date, default: null },

    counters: {
      checkins: { type: Number, default: 0 },
      timesheets: { type: Number, default: 0 },
      goalsCompleted: { type: Number, default: 0 },
      certs: { type: Number, default: 0 },
      kudosReceived: { type: Number, default: 0 },
      kudosGiven: { type: Number, default: 0 },
      perfectMonths: { type: Number, default: 0 },
      referrals: { type: Number, default: 0 },
      bugFixes: { type: Number, default: 0 },
      hackathonWins: { type: Number, default: 0 },
    },

    badges: { type: [String], default: [] },
    events: { type: [EventSchema], default: [] },
  },
  { timestamps: true }
);

GamificationProfileSchema.index({ company: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('GamificationProfile', GamificationProfileSchema);
