const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    period: String, // e.g. "2026-H1", "2026-Q2"
    weight: { type: Number, default: 1 },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'], default: 'OPEN' },
    completion: { type: Number, default: 0, min: 0, max: 100 },
    dueDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', GoalSchema);
