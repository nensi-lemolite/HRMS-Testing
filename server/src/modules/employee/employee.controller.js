const fs = require("fs");
const path = require("path");
const asyncHandler = require("express-async-handler");
const Employee = require("../../models/Employee");
const User = require("../../models/User");
const Role = require("../../models/Role");
const Document = require("../../models/Document");
const Asset = require("../../models/Asset");
const Goal = require("../../models/Goal");
const AppraisalReview = require("../../models/AppraisalReview");
const ApiError = require("../../utils/ApiError");
const { getCountryProfile } = require("../../countries");
const { awardEmployee } = require("../gamification/awardService");
const { UPLOAD_ROOT, publicPath } = require("../../middleware/upload");

// GET /api/employees
// Scope is determined server-side:
//   - SUPER_ADMIN / HR_ADMIN see employees across every enabled country
//   - MANAGER is limited to their own country (team scope)
//   - EMPLOYEE only ever sees their own record
const list = asyncHandler(async (req, res) => {
  const filter = { company: req.user.company };
  const adminRoles = ["SUPER_ADMIN", "HR_ADMIN"];
  if (req.user.role === "EMPLOYEE") {
    filter._id = req.user.employee || null;
  } else if (!adminRoles.includes(req.user.role)) {
    filter.country = req.user.country;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.country && adminRoles.includes(req.user.role)) {
    filter.country = req.query.country;
  }

  // Hide SUPER_ADMIN-linked employees from the listing.
  if (req.user.role !== "EMPLOYEE") {
    const adminUsers = await User.find({
      company: req.user.company,
      role: "SUPER_ADMIN",
    })
      .select("employee")
      .lean();
    const adminEmployeeIds = adminUsers.map((u) => u.employee).filter(Boolean);
    if (adminEmployeeIds.length > 0) {
      filter._id = { $nin: adminEmployeeIds };
    }
  }

  const employees = await Employee.find(filter).sort({ empCode: 1 }).lean();
  const ids = employees.map((e) => e._id);
  const users = await User.find({ employee: { $in: ids } })
    .select("email role isActive lastLoginAt employee")
    .lean();
  const byEmployee = new Map(users.map((u) => [String(u.employee), u]));
  const withLogin = employees.map((e) => ({
    ...e,
    login: byEmployee.get(String(e._id)) || null,
  }));
  res.json({ count: withLogin.length, employees: withLogin });
});

// GET /api/employees/:id
const get = asyncHandler(async (req, res) => {
  if (
    req.user.role === "EMPLOYEE" &&
    (!req.user.employee || String(req.user.employee) !== String(req.params.id))
  ) {
    throw new ApiError(403, "You can only view your own profile");
  }
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) throw new ApiError(404, "Employee not found");
  const user = await User.findOne({ employee: employee._id }).select(
    "email role isActive lastLoginAt",
  );

  const [documentsCount, assetsCount, openGoalsCount, appraisalsCount] =
    await Promise.all([
      Document.countDocuments({ employee: employee._id }),
      Asset.countDocuments({ employee: employee._id, status: "ASSIGNED" }),
      Goal.countDocuments({
        employee: employee._id,
        status: { $in: ["OPEN", "IN_PROGRESS"] },
      }),
      AppraisalReview.countDocuments({ employee: employee._id }),
    ]);

  res.json({
    employee,
    login: user,
    counts: { documentsCount, assetsCount, openGoalsCount, appraisalsCount },
  });
});

// POST /api/employees/:id/photo  (multipart: photo)
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "photo is required");
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(404, "Employee not found");
  }

  // Remove the previous photo from disk (best-effort)
  if (employee.profilePhoto) {
    const rel = employee.profilePhoto.replace(/^\/uploads\//, "");
    const abs = path.join(UPLOAD_ROOT, rel);
    fs.promises.unlink(abs).catch(() => {});
  }

  employee.profilePhoto = publicPath(req.file.path);
  await employee.save();
  res.json({ employee });
});

// POST /api/employees
// Body may include `loginPassword` to auto-create a User account for the employee.
const create = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const country = (
    body.country ||
    req.country ||
    req.user.country ||
    ""
  ).toUpperCase();
  if (!country) throw new ApiError(400, "country is required");

  const profile = getCountryProfile(country);
  validateCountryIdentifiers(profile, body.countrySpecific);

  const { loginPassword, ...employeeData } = body;

  // Pre-validate login creation before writing anything
  if (loginPassword) {
    if (!employeeData.email)
      throw new ApiError(400, "Email is required to create a login");
    if (loginPassword.length < 6)
      throw new ApiError(400, "Password must be at least 6 characters");
    const existing = await User.findOne({
      email: employeeData.email.toLowerCase(),
    });
    if (existing)
      throw new ApiError(409, "A user with this email already exists");
  }

  const employee = await Employee.create({
    ...employeeData,
    country,
    company: req.user.company,
  });

  let login = null;
  if (loginPassword) {
    const user = new User({
      email: employeeData.email,
      name: employeeData.name,
      role: "EMPLOYEE",
      company: req.user.company,
      employee: employee._id,
      country,
    });
    await user.setPassword(loginPassword);
    try {
      await user.save();
      login = { email: user.email, role: user.role };
    } catch (err) {
      // Roll back the employee record so the form can be retried cleanly
      await Employee.deleteOne({ _id: employee._id });
      throw err;
    }
  }

  res.status(201).json({ employee, login });
});

// PATCH /api/employees/:id
const update = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) throw new ApiError(404, "Employee not found");

  const nextCountry = req.body.country || employee.country;
  const profile = getCountryProfile(nextCountry);
  if (req.body.countrySpecific) {
    validateCountryIdentifiers(profile, req.body.countrySpecific);
  }

  const prevEmail = employee.email;
  const prevCerts = (employee.certifications || []).length;
  Object.assign(employee, req.body, { country: nextCountry });
  await employee.save();

  // Auto-award for each newly added certification.
  const newCerts = (employee.certifications || []).length - prevCerts;
  for (let i = 0; i < newCerts; i++) {
    awardEmployee(employee.company, employee._id, 'CERT', 'Certification added');
  }

  // Keep the linked sign-in account in sync when the email or name changes.
  if (req.body.email && req.body.email !== prevEmail) {
    const linked = await User.findOne({ employee: employee._id });
    if (linked) {
      const newEmail = String(employee.email).trim().toLowerCase();
      const clash = await User.findOne({
        email: newEmail,
        _id: { $ne: linked._id },
      });
      if (clash) {
        throw new ApiError(
          409,
          `Another user already exists with email ${newEmail}.`,
        );
      }
      linked.email = newEmail;
      if (req.body.name) linked.name = employee.name;
      await linked.save();
    }
  } else if (req.body.name) {
    await User.updateOne({ employee: employee._id }, { name: employee.name });
  }

  res.json({ employee });
});

// DELETE /api/employees/:id  — hard delete + cascade remove linked user.
// (To offboard while keeping history, PATCH the employee with { status: 'EXITED' }.)
const remove = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) throw new ApiError(404, "Employee not found");
  await User.deleteMany({ employee: employee._id });
  await Employee.deleteOne({ _id: employee._id });
  res.json({ deleted: true, id: employee._id });
});

function validateCountryIdentifiers(profile, countrySpecific = {}) {
  const v = profile.compliance?.validators || {};
  if (profile.code === "IN") {
    if (countrySpecific.pan && !v.validatePAN(countrySpecific.pan)) {
      throw new ApiError(400, "Invalid PAN format");
    }
    if (
      countrySpecific.aadhaar &&
      !v.validateAadhaar(countrySpecific.aadhaar)
    ) {
      throw new ApiError(400, "Invalid Aadhaar number");
    }
  }
  if (profile.code === "QA") {
    if (countrySpecific.qid && !v.validateQID(countrySpecific.qid)) {
      throw new ApiError(400, "Invalid Qatar ID format");
    }
  }
}

// POST /api/employees/:id/reset-password
// Body: { newPassword? } — if omitted, server generates a temp password.
// If the employee has no linked User account, one is created on the fly using
// the employee's email and role=EMPLOYEE. Returns the new password ONCE so
// the admin can share it.
const resetPassword = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) throw new ApiError(404, "Employee not found");

  let user = await User.findOne({ employee: employee._id });
  let createdLogin = false;

  if (!user) {
    // Auto-create a sign-in account for this employee.
    if (!employee.email) {
      throw new ApiError(
        400,
        "Employee has no email — add one to the profile before creating a login.",
      );
    }
    const normalizedEmail = String(employee.email).trim().toLowerCase();
    const clash = await User.findOne({ email: normalizedEmail });
    if (clash) {
      throw new ApiError(
        409,
        `A user with email ${normalizedEmail} already exists but is linked to another employee.`,
      );
    }
    user = new User({
      email: normalizedEmail,
      name: employee.name,
      role: "EMPLOYEE",
      company: req.user.company,
      employee: employee._id,
      country: employee.country,
      isActive: true,
    });
    createdLogin = true;
  } else if (user.role === "SUPER_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    throw new ApiError(
      403,
      "Only a Super Admin can reset another Super Admin's password",
    );
  }

  let newPassword = req.body?.newPassword;
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters");
    }
  } else {
    newPassword = generateTempPassword();
  }

  await user.setPassword(newPassword);
  await user.save();
  res.json({
    ok: true,
    newPassword,
    createdLogin,
    login: { email: user.email, role: user.role, isActive: user.isActive },
  });
});

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// PATCH /api/employees/:id/access
// Body: { isActive?, role? }
//   - isActive: enable/disable sign-in for the linked user. Requires
//     `employees.write` (HR / admin).
//   - role: change the user's role. Requires `roles.write` (typically
//     SUPER_ADMIN only). Cannot promote to or demote from SUPER_ADMIN
//     unless caller is SUPER_ADMIN.
const updateAccess = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    company: req.user.company,
  });
  if (!employee) throw new ApiError(404, "Employee not found");

  const user = await User.findOne({ employee: employee._id });
  const perms = req.permissions || [];
  const isSelf = user && String(user._id) === String(req.user._id);

  // Unified Active/Inactive toggle: flips employee.status (ACTIVE ↔ EXITED)
  // and the linked sign-in account's isActive flag together. This is the
  // single concept HR uses from the Employees listing.
  if (typeof req.body.active === "boolean") {
    if (!perms.includes("employees.write"))
      throw new ApiError(403, "Missing permission: employees.write");
    if (isSelf && req.body.active === false) {
      throw new ApiError(400, "You cannot mark yourself inactive");
    }
    employee.status = req.body.active ? "ACTIVE" : "EXITED";
    if (!req.body.active && !employee.exitDate) employee.exitDate = new Date();
    await employee.save();
    if (user) user.isActive = req.body.active;
  }

  if (req.body.role) {
    if (!user)
      throw new ApiError(404, "No sign-in account linked to this employee");
    if (!perms.includes("roles.write"))
      throw new ApiError(403, "Missing permission: roles.write");
    if (
      (user.role === "SUPER_ADMIN" || req.body.role === "SUPER_ADMIN") &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      throw new ApiError(
        403,
        "Only a Super Admin can grant or revoke SUPER_ADMIN",
      );
    }
    if (user.role === "SUPER_ADMIN" && req.body.role !== "SUPER_ADMIN") {
      const count = await User.countDocuments({
        company: req.user.company,
        role: "SUPER_ADMIN",
        isActive: true,
      });
      if (count <= 1)
        throw new ApiError(400, "At least one SUPER_ADMIN must remain");
    }
    const role = await Role.findOne({
      company: req.user.company,
      key: req.body.role,
    });
    if (!role) throw new ApiError(400, "Invalid role");
    user.role = req.body.role;
  }

  if (user) await user.save();
  res.json({
    employee,
    login: user
      ? {
          _id: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
        }
      : null,
  });
});

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  uploadProfilePhoto,
  resetPassword,
  updateAccess,
};
