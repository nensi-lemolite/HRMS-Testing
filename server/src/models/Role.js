const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    key: { type: String, required: true, trim: true, uppercase: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false }, // system roles can't be deleted or key-renamed
  },
  { timestamps: true }
);

RoleSchema.index({ company: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Role', RoleSchema);
