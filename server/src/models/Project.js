const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    client: String,
    description: String,
    tech: { type: [String], default: [] },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ON_HOLD'], default: 'ACTIVE' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true }
);

ProjectSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
