const mongoose = require('mongoose');

const KpiSchema = new mongoose.Schema(
  {
    name: String,
    target: String,
    achieved: String,
    score: { type: Number, min: 0, max: 5 },
  },
  { _id: false }
);

const AppraisalReviewSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    period: { type: String, required: true }, // "2026-H1"
    kpis: { type: [KpiSchema], default: [] },
    rating: { type: Number, min: 1, max: 5 },
    managerFeedback: String,
    employeeComments: String,
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'FINALIZED'], default: 'DRAFT' },
  },
  { timestamps: true }
);

AppraisalReviewSchema.index({ employee: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('AppraisalReview', AppraisalReviewSchema);
