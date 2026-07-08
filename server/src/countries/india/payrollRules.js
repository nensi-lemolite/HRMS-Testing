// India payroll engine — statutory monthly computations.
// Reads optional per-employee overrides from employee.countrySpecific:
//   { professionalTaxState, taxRegime: 'OLD'|'NEW', declarations: { s80C, s80D, homeLoanInterest, hraExempt } }
// Amounts in the salary structure are treated as MONTHLY.

// ---- Provident Fund (EPF) ----
const PF_WAGE_CEILING = 15000; // statutory ceiling on PF wages
const PF_RATE = 0.12;
const EPS_RATE = 0.0833;       // employer share diverted to pension, capped at the ceiling
const EDLI_RATE = 0.005;       // employer
const PF_ADMIN_RATE = 0.005;   // employer admin charges

// ---- ESI ----
const ESI_THRESHOLD = 21000;   // applies when monthly gross <= this
const ESI_EMP_RATE = 0.0075;
const ESI_ER_RATE = 0.0325;

// ---- Professional Tax (monthly, by state) ----
const PT_STATES = {
  KA: (g) => (g >= 25000 ? 200 : 0),
  MH: (g) => (g > 10000 ? 200 : g >= 7501 ? 175 : 0),
  WB: (g) => (g > 40000 ? 200 : g > 15000 ? 130 : g > 10000 ? 110 : g > 8500 ? 90 : 0),
  TN: (g) => (g > 12500 ? 182 : g > 9167 ? 126 : g > 7500 ? 47 : 0),
  TG: (g) => (g >= 20000 ? 200 : g >= 15001 ? 150 : 0),
  GJ: (g) => (g > 12000 ? 200 : 0),
  DEFAULT: (g) => (g >= 15000 ? 200 : 0),
};

// ---- Income Tax (TDS) ----
const CESS = 0.04;
const NEW_REGIME = {
  standardDeduction: 75000,
  rebateLimit: 700000, // taxable income up to this -> no tax (87A)
  slabs: [
    { upto: 300000, rate: 0 },
    { upto: 700000, rate: 0.05 },
    { upto: 1000000, rate: 0.10 },
    { upto: 1200000, rate: 0.15 },
    { upto: 1500000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ],
};
const OLD_REGIME = {
  standardDeduction: 50000,
  rebateLimit: 500000,
  slabs: [
    { upto: 250000, rate: 0 },
    { upto: 500000, rate: 0.05 },
    { upto: 1000000, rate: 0.20 },
    { upto: Infinity, rate: 0.30 },
  ],
};

function slabTax(taxable, slabs) {
  let tax = 0;
  let prev = 0;
  for (const s of slabs) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, s.upto) - prev) * s.rate;
    prev = s.upto;
  }
  return tax;
}

function annualIncomeTax(annualGross, regime, decl) {
  const R = regime === 'OLD' ? OLD_REGIME : NEW_REGIME;
  let taxable = annualGross - R.standardDeduction;
  if (regime === 'OLD') {
    const d = decl || {};
    taxable -= Math.min(Number(d.s80C) || 0, 150000);
    taxable -= Number(d.s80D) || 0;
    taxable -= Number(d.homeLoanInterest) || 0;
    taxable -= Number(d.hraExempt) || 0;
  }
  taxable = Math.max(0, taxable);

  let tax = slabTax(taxable, R.slabs);
  if (taxable <= R.rebateLimit) tax = 0; // Section 87A rebate

  let surcharge = 0;
  if (taxable > 20000000) surcharge = tax * (regime === 'OLD' ? 0.37 : 0.25);
  else if (taxable > 10000000) surcharge = tax * 0.15;
  else if (taxable > 5000000) surcharge = tax * 0.10;

  const cess = (tax + surcharge) * CESS;
  return Math.max(0, Math.round(tax + surcharge + cess));
}

function calcPF(basic) {
  const wage = Math.min(basic, PF_WAGE_CEILING);
  const employee = Math.round(wage * PF_RATE);
  const eps = Math.round(wage * EPS_RATE);
  const employerEpf = Math.max(0, employee - eps); // employer 12% minus the EPS share
  const edli = Math.round(wage * EDLI_RATE);
  const admin = Math.round(wage * PF_ADMIN_RATE);
  return { employee, eps, employerEpf, edli, admin, employerTotal: employerEpf + eps + edli + admin };
}

function computePayslip({ components, employee }) {
  const c = components || {};
  const num = (k) => Number(c[k] ?? c[k.toUpperCase()] ?? c[k.toLowerCase()] ?? 0);
  const basic = num('basic');
  const hra = num('hra');
  const special = num('special');
  const lta = num('lta');
  const gross = basic + hra + special + lta;

  const cs = (employee && employee.countrySpecific) || {};
  const ptState = String(cs.professionalTaxState || cs.ptState || 'DEFAULT').toUpperCase();
  const regime = String(cs.taxRegime || 'NEW').toUpperCase();
  const decl = cs.declarations || {};

  const pf = calcPF(basic);
  const esiApplicable = gross > 0 && gross <= ESI_THRESHOLD;
  const esiEmployee = esiApplicable ? Math.round(gross * ESI_EMP_RATE) : 0;
  const esiEmployer = esiApplicable ? Math.round(gross * ESI_ER_RATE) : 0;
  const pt = (PT_STATES[ptState] || PT_STATES.DEFAULT)(gross);
  const tds = Math.round(annualIncomeTax(gross * 12, regime, decl) / 12);

  const earnings = [
    { code: 'BASIC', label: 'Basic', amount: basic },
    { code: 'HRA', label: 'House Rent Allowance', amount: hra },
    { code: 'SPECIAL', label: 'Special Allowance', amount: special },
    { code: 'LTA', label: 'Leave Travel Allowance', amount: lta },
  ];

  const deductions = [{ code: 'PF', label: 'Provident Fund (12%)', amount: pf.employee }];
  if (esiEmployee) deductions.push({ code: 'ESI', label: 'ESI (0.75%)', amount: esiEmployee });
  deductions.push({ code: 'PT', label: `Professional Tax${ptState !== 'DEFAULT' ? ` · ${ptState}` : ''}`, amount: pt });
  deductions.push({ code: 'TDS', label: `Income Tax · ${regime === 'OLD' ? 'Old' : 'New'} regime`, amount: tds });

  const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0);
  const net = gross - totalDeduction;

  const employer = {
    pf: pf.employerEpf,
    eps: pf.eps,
    edli: pf.edli,
    admin: pf.admin,
    esi: esiEmployer,
    total: pf.employerTotal + esiEmployer,
  };

  return {
    earnings,
    deductions,
    gross,
    totalDeduction,
    net,
    extras: {
      employer,
      ctc: gross + employer.total, // monthly cost to company (approx)
      regime,
      ptState,
      esiApplicable,
    },
  };
}

module.exports = {
  componentCodes: ['BASIC', 'HRA', 'SPECIAL', 'LTA'],
  deductionCodes: ['PF', 'ESI', 'PT', 'TDS'],
  computePayslip,
};
