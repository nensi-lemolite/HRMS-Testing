const mongoose = require('mongoose');

const ASSET_KINDS = [
  'LAPTOP',
  'MONITOR',
  'KEYBOARD',
  'MOUSE',
  'HEADSET',
  'ACCESS_CARD',
  'SOFTWARE_LICENSE',
  'PHONE',
  'OTHER',
];

const ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'RETURNED', 'LOST', 'DAMAGED'];

const AssetSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true, default: null },
    kind: { type: String, enum: ASSET_KINDS, default: 'OTHER' },
    tag: { type: String, trim: true },     // asset tag / inventory ID
    label: { type: String, trim: true },   // e.g. "MacBook Pro 14"
    serial: { type: String, trim: true },
    condition: String,                     // free text on assignment
    assignedAt: Date,
    returnedAt: Date,
    status: { type: String, enum: ASSET_STATUSES, default: 'AVAILABLE' },
    notes: String,
  },
  { timestamps: true }
);

AssetSchema.statics.KINDS = ASSET_KINDS;
AssetSchema.statics.STATUSES = ASSET_STATUSES;

module.exports = mongoose.model('Asset', AssetSchema);
