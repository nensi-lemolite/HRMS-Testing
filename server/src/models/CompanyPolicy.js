const mongoose = require('mongoose');

// A company-wide policy document (leave policy, code of conduct, etc.)
// shown to every employee under Settings → Company Policies.
const CompanyPolicySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyPolicy', CompanyPolicySchema);
