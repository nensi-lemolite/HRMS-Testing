const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { listCountries, getCountryProfile } = require('../../countries');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.json({ countries: listCountries() });
});

router.get('/:code/profile', authenticate, (req, res) => {
  try {
    const profile = getCountryProfile(req.params.code);
    res.json({
      code: profile.code,
      name: profile.name,
      timezone: profile.timezone,
      currency: profile.currency,
      leavePolicy: profile.leavePolicy,
      payrollComponents: profile.payrollRules.componentCodes,
      payrollDeductions: profile.payrollRules.deductionCodes,
      identifiers: profile.compliance.identifiers,
    });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

module.exports = router;
