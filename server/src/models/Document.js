const mongoose = require('mongoose');

const DOCUMENT_KINDS = [
  'RESUME',
  'OFFER_LETTER',
  'APPOINTMENT_LETTER',
  'ID_PROOF',
  'PAN_CARD',
  'AADHAAR',
  'EDUCATION_CERTIFICATE',
  'EXPERIENCE_LETTER',
  'RELIEVING_LETTER',
  'OTHER',
];

const DocumentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    kind: { type: String, enum: DOCUMENT_KINDS, default: 'OTHER' },
    label: { type: String, trim: true },
    fileName: String,    // original filename uploaded
    filePath: String,    // /uploads/documents/<stored>
    mimeType: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DocumentSchema.statics.KINDS = DOCUMENT_KINDS;

module.exports = mongoose.model('Document', DocumentSchema);
