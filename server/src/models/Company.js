const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    defaultCountry: { type: String, enum: ['IN', 'QA'], default: 'IN' },
    enabledCountries: [{ type: String, enum: ['IN', 'QA'] }],
    fiscalYearStart: { type: String, default: '04-01' }, // MM-DD
    logoUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', CompanySchema);
