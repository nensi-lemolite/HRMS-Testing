const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    country: { type: String, enum: ['IN', 'QA'], required: true, index: true },
    year: { type: Number, required: true },
    date: { type: Date, required: true },
    name: { type: String, required: true },
    isOptional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

HolidaySchema.index({ company: 1, country: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', HolidaySchema);
