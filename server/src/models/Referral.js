const mongoose = require('mongoose');

const REFERRAL_STATUSES = ['NEW', 'IN_REVIEW', 'HIRED', 'JOINED', 'REJECTED'];
const REFERRAL_LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'LEAD'];
const REFERRAL_SOURCES = ['LINKEDIN', 'EMAIL', 'PHONE', 'INPERSON', 'OTHER'];
const REWARD_STATUSES = ['PENDING', 'APPROVED', 'PAID'];

const StatusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: REFERRAL_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { _id: false }
);

const ReferralSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, trim: true, lowercase: true },
    candidatePhone: { type: String, trim: true },
    position: { type: String, trim: true },
    level: { type: String, enum: REFERRAL_LEVELS, default: 'MID' },
    source: { type: String, enum: REFERRAL_SOURCES, default: 'OTHER' },
    notes: String,
    status: { type: String, enum: REFERRAL_STATUSES, default: 'NEW', index: true },
    statusHistory: [StatusEventSchema],
    bonusAmount: { type: Number, default: 0 },
    bonusCurrency: { type: String, default: 'INR' },
    rewardStatus: { type: String, enum: REWARD_STATUSES, default: 'PENDING' },
    rejectionReason: String,
    joinDate: Date,
  },
  { timestamps: true }
);

ReferralSchema.statics.STATUSES = REFERRAL_STATUSES;
ReferralSchema.statics.LEVELS = REFERRAL_LEVELS;
ReferralSchema.statics.SOURCES = REFERRAL_SOURCES;
ReferralSchema.statics.REWARD_STATUSES = REWARD_STATUSES;

module.exports = mongoose.model('Referral', ReferralSchema);
