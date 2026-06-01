const mongoose = require('mongoose');

// Departments and designations live in one collection, distinguished by `type`.
// They are simple company-scoped lookup lists used to populate the
// Department / Designation dropdowns on the employee form.
const OrgUnitSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    type: { type: String, enum: ['DEPARTMENT', 'DESIGNATION'], required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// No two entries of the same type may share a name within a company.
OrgUnitSchema.index({ company: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('OrgUnit', OrgUnitSchema);
