const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SYSTEM_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'];

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'EMPLOYEE', uppercase: true, trim: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    country: { type: String, enum: ['IN', 'QA'], required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function setPassword(plain) {
  const normalized = String(plain || '').trim();
  this.passwordHash = await bcrypt.hash(normalized, 10);
};

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  const normalized = String(plain || '').trim();
  return bcrypt.compare(normalized, this.passwordHash);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  return obj;
};

UserSchema.statics.SYSTEM_ROLES = SYSTEM_ROLES;

module.exports = mongoose.model('User', UserSchema);
