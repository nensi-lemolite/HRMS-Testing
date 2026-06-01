const mongoose = require('mongoose');

const SalaryComponentSchema = new mongoose.Schema(
  {
    code: String,    // BASIC, HRA, HOUSING, ...
    label: String,
    amount: Number,
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const EmergencyContactSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    relation: String,
  },
  { _id: false }
);

const CertificationSchema = new mongoose.Schema(
  {
    name: String,
    issuer: String,
    year: Number,
    credentialUrl: String,
  },
  { _id: false }
);

const EmployeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    empCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    dob: Date,
    gender: { type: String, enum: ['M', 'F', 'O'] },

    // Section 1 — Basic info
    profilePhoto: String, // /uploads/photos/<file>
    maritalStatus: { type: String, enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', ''], default: '' },
    bloodGroup: { type: String, trim: true },
    address: {
      current: { type: AddressSchema, default: () => ({}) },
      permanent: { type: AddressSchema, default: () => ({}) },
    },
    emergencyContact: { type: EmergencyContactSchema, default: () => ({}) },

    // Section 2 — Employment details
    country: { type: String, enum: ['IN', 'QA'], required: true, index: true },
    department: String,
    designation: String,
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    joinDate: { type: Date, required: true },
    probationEndDate: Date,
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    workLocation: String,
    officeBranch: String,
    exitDate: Date,
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_NOTICE', 'RESIGNED', 'TERMINATED', 'EXITED'],
      default: 'ACTIVE',
    },

    // Section 3 — Organization hierarchy
    team: String,
    teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    hrAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    grade: String, // L1, L2, Senior, etc.

    // Section 4 — IT-specific details
    skills: { type: [String], default: [] },
    experienceYears: Number,
    certifications: { type: [CertificationSchema], default: [] },
    currentProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    technologyStack: { type: [String], default: [] },
    githubUrl: String,
    linkedinUrl: String,
    portfolioUrl: String,

    // Section 5 — Attendance & shift
    shiftAssignment: String, // e.g., "Morning 9-6"
    workHours: Number,       // hours per day
    weeklyOff: { type: [String], default: [] }, // ['SAT', 'SUN']
    workMode: {
      type: String,
      enum: ['WFO', 'WFH', 'HYBRID'],
      default: 'WFO',
    },

    // Section 6 — Salary (current snapshot; history lives in SalaryHistory)
    ctc: Number,
    basicSalary: Number,
    salaryStructure: [SalaryComponentSchema],

    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,    // India
      iban: String,    // Qatar
    },

    // Country-specific identifiers / fields live here to keep schema flexible.
    countrySpecific: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // India: { pan, aadhaar, uan }
      // Qatar: { qid, passport, visa, sponsor }
    },
  },
  { timestamps: true }
);

EmployeeSchema.index({ company: 1, empCode: 1 }, { unique: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
