const asyncHandler = require('express-async-handler');
const Referral = require('../../models/Referral');
const ReferralPolicy = require('../../models/ReferralPolicy');
const Employee = require('../../models/Employee');
const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');

function canSeeAll(req) {
  return (req.permissions || []).includes('referrals.read.all');
}
function canWrite(req) {
  return (req.permissions || []).includes('referrals.write');
}

const DEFAULT_POLICY = {
  text:
    'Refer top talent from your network. When your referral is hired and completes 90 days with us, you earn a referral bonus based on the position level. Bonuses are credited with the next payroll cycle.',
  bonusTiers: [
    { level: 'JUNIOR', amount: 10000 },
    { level: 'MID', amount: 25000 },
    { level: 'SENIOR', amount: 50000 },
    { level: 'LEAD', amount: 75000 },
  ],
  currency: 'INR',
  eligibility:
    'Open to all active employees. You cannot refer your direct reports or immediate family. The candidate must not be already in our hiring pipeline.',
  payoutCondition:
    'Bonus is paid once the referred candidate completes their first 90 days.',
};

// GET /api/referrals
const list = asyncHandler(async (req, res) => {
  const filter = { company: req.user.company };
  const forceMine = req.query.mine === '1';
  if (!canSeeAll(req) || forceMine) {
    if (!req.user.employee) return res.json({ referrals: [] });
    filter.referrer = req.user.employee;
  } else if (req.query.referrer) {
    filter.referrer = req.query.referrer;
  }
  if (req.query.status) filter.status = req.query.status;

  const referrals = await Referral.find(filter)
    .populate('referrer', 'empCode name email designation department')
    .sort({ createdAt: -1 });
  res.json({ referrals });
});

// GET /api/referrals/:id
const get = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ _id: req.params.id, company: req.user.company })
    .populate('referrer', 'empCode name email designation department');
  if (!referral) throw new ApiError(404, 'Referral not found');
  if (!canSeeAll(req) && String(referral.referrer?._id) !== String(req.user.employee)) {
    throw new ApiError(403, 'Forbidden');
  }
  res.json({ referral });
});

// POST /api/referrals
const create = asyncHandler(async (req, res) => {
  // Resolve referrer. Most users have a linked employee record; older
  // orphan accounts (e.g. founder SUPER_ADMINs created before auto-employee
  // wiring) might not — recover by email lookup and self-heal the link.
  let emp = null;
  if (req.user.employee) {
    emp = await Employee.findOne({ _id: req.user.employee, company: req.user.company });
  }
  if (!emp && req.user.email) {
    emp = await Employee.findOne({ company: req.user.company, email: req.user.email });
    if (emp) {
      await User.updateOne({ _id: req.user._id }, { employee: emp._id });
    }
  }
  if (!emp) {
    throw new ApiError(
      400,
      "Your account isn't linked to an employee profile. Ask an admin to add one before submitting a referral."
    );
  }

  const { candidateName, candidateEmail, candidatePhone, position, level, source, notes } = req.body;
  if (!candidateName) throw new ApiError(400, 'candidateName is required');

  const referral = await Referral.create({
    company: req.user.company,
    referrer: emp._id,
    candidateName: candidateName.trim(),
    candidateEmail: candidateEmail || undefined,
    candidatePhone: candidatePhone || undefined,
    position,
    level: level || 'MID',
    source: source || 'OTHER',
    notes,
    status: 'NEW',
    statusHistory: [{ status: 'NEW', by: req.user._id, at: new Date() }],
  });
  res.status(201).json({ referral });
});

// PATCH /api/referrals/:id
// Employees can edit ONLY their own pending (NEW) referrals' contact fields.
// HR/Admin (referrals.write) can change status, bonus, reward, rejection reason.
const update = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ _id: req.params.id, company: req.user.company });
  if (!referral) throw new ApiError(404, 'Referral not found');

  const isOwner = String(referral.referrer) === String(req.user.employee);
  const hasWrite = canWrite(req);

  if (!hasWrite && !isOwner) throw new ApiError(403, 'Forbidden');

  if (isOwner && !hasWrite) {
    if (referral.status !== 'NEW') {
      throw new ApiError(400, 'You can only edit a referral while it is still NEW');
    }
    // Allow editing contact / candidate fields only
    const allowed = ['candidateName', 'candidateEmail', 'candidatePhone', 'position', 'level', 'source', 'notes'];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) referral[k] = req.body[k];
    });
    await referral.save();
    return res.json({ referral });
  }

  // HR / Admin path
  const { status, bonusAmount, bonusCurrency, rewardStatus, rejectionReason, joinDate, ...rest } = req.body;
  const editableByHr = ['candidateName', 'candidateEmail', 'candidatePhone', 'position', 'level', 'source', 'notes'];
  editableByHr.forEach((k) => {
    if (rest[k] !== undefined) referral[k] = rest[k];
  });

  if (status && status !== referral.status) {
    if (!Referral.STATUSES.includes(status)) throw new ApiError(400, 'Invalid status');
    referral.status = status;
    referral.statusHistory.push({ status, by: req.user._id, at: new Date(), note: rest.statusNote });
    if (status === 'JOINED' && !referral.joinDate) referral.joinDate = joinDate ? new Date(joinDate) : new Date();
    if (status === 'REJECTED' && rejectionReason) referral.rejectionReason = rejectionReason;
  } else if (joinDate !== undefined) {
    referral.joinDate = joinDate ? new Date(joinDate) : null;
  }
  if (bonusAmount !== undefined) referral.bonusAmount = Number(bonusAmount) || 0;
  if (bonusCurrency !== undefined) referral.bonusCurrency = bonusCurrency;
  if (rewardStatus !== undefined) {
    if (!Referral.REWARD_STATUSES.includes(rewardStatus)) throw new ApiError(400, 'Invalid rewardStatus');
    referral.rewardStatus = rewardStatus;
  }
  if (rejectionReason !== undefined) referral.rejectionReason = rejectionReason;

  await referral.save();
  res.json({ referral });
});

// DELETE /api/referrals/:id  (HR/Admin or owner if still NEW)
const remove = asyncHandler(async (req, res) => {
  const referral = await Referral.findOne({ _id: req.params.id, company: req.user.company });
  if (!referral) throw new ApiError(404, 'Referral not found');
  const isOwner = String(referral.referrer) === String(req.user.employee);
  const hasWrite = canWrite(req);
  if (!hasWrite && !(isOwner && referral.status === 'NEW')) {
    throw new ApiError(403, 'Forbidden');
  }
  await Referral.deleteOne({ _id: referral._id });
  res.json({ deleted: true, id: referral._id });
});

// GET /api/referrals/policy  (any authenticated user)
const getPolicy = asyncHandler(async (req, res) => {
  let policy = await ReferralPolicy.findOne({ company: req.user.company });
  if (!policy) {
    policy = await ReferralPolicy.create({ company: req.user.company, ...DEFAULT_POLICY });
  }
  res.json({ policy });
});

// PUT /api/referrals/policy  (referrals.policy.write)
const updatePolicy = asyncHandler(async (req, res) => {
  const { text, bonusTiers, currency, eligibility, payoutCondition } = req.body;
  let policy = await ReferralPolicy.findOne({ company: req.user.company });
  if (!policy) {
    policy = new ReferralPolicy({ company: req.user.company, ...DEFAULT_POLICY });
  }
  if (text !== undefined) policy.text = text;
  if (Array.isArray(bonusTiers)) {
    policy.bonusTiers = bonusTiers
      .filter((t) => t && t.level)
      .map((t) => ({ level: String(t.level).toUpperCase().trim(), amount: Number(t.amount) || 0 }));
  }
  if (currency !== undefined) policy.currency = currency;
  if (eligibility !== undefined) policy.eligibility = eligibility;
  if (payoutCondition !== undefined) policy.payoutCondition = payoutCondition;
  policy.updatedBy = req.user._id;
  await policy.save();
  res.json({ policy });
});

// GET /api/referrals/stats  (read.all)
const stats = asyncHandler(async (req, res) => {
  const match = { company: req.user.company };
  const all = await Referral.find(match).select('status bonusAmount rewardStatus');
  const byStatus = all.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const bonusPending = all
    .filter((r) => r.rewardStatus !== 'PAID' && (r.status === 'JOINED' || r.status === 'HIRED'))
    .reduce((s, r) => s + (r.bonusAmount || 0), 0);
  const bonusPaid = all
    .filter((r) => r.rewardStatus === 'PAID')
    .reduce((s, r) => s + (r.bonusAmount || 0), 0);
  res.json({
    total: all.length,
    byStatus,
    bonusPending,
    bonusPaid,
  });
});

module.exports = { list, get, create, update, remove, getPolicy, updatePolicy, stats };
