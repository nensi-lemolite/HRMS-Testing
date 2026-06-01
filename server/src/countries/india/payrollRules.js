// Simplified India payroll rules. Slabs / rates can be tuned per FY in Settings.

const PF_EMPLOYEE_RATE = 0.12;
const PF_WAGE_CEILING = 15000;
const PROF_TAX_MONTHLY = 200;

function calcPF(basic) {
  const pfBase = Math.min(basic, PF_WAGE_CEILING);
  return Math.round(pfBase * PF_EMPLOYEE_RATE);
}

function calcProfessionalTax(gross) {
  if (gross < 15000) return 0;
  return PROF_TAX_MONTHLY;
}

// Very simplified monthly TDS estimate (new regime style). Replace with full slab logic later.
function calcTDS(annualGross) {
  let tax = 0;
  let remaining = annualGross;
  const slabs = [
    { limit: 300000, rate: 0 },
    { limit: 300000, rate: 0.05 },
    { limit: 300000, rate: 0.10 },
    { limit: 300000, rate: 0.15 },
    { limit: 300000, rate: 0.20 },
    { limit: Infinity, rate: 0.30 },
  ];
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, slab.limit);
    tax += slice * slab.rate;
    remaining -= slice;
  }
  return Math.round(tax / 12);
}

function computePayslip({ components }) {
  const basic = Number(components.basic || 0);
  const hra = Number(components.hra || 0);
  const special = Number(components.special || 0);
  const lta = Number(components.lta || 0);

  const gross = basic + hra + special + lta;
  const pf = calcPF(basic);
  const pt = calcProfessionalTax(gross);
  const tds = calcTDS(gross * 12);

  const deductions = [
    { code: 'PF', label: 'Provident Fund', amount: pf },
    { code: 'PT', label: 'Professional Tax', amount: pt },
    { code: 'TDS', label: 'Income Tax', amount: tds },
  ];

  const earnings = [
    { code: 'BASIC', label: 'Basic', amount: basic },
    { code: 'HRA', label: 'House Rent Allowance', amount: hra },
    { code: 'SPECIAL', label: 'Special Allowance', amount: special },
    { code: 'LTA', label: 'Leave Travel Allowance', amount: lta },
  ];

  const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0);
  const net = gross - totalDeduction;

  return { earnings, deductions, gross, totalDeduction, net };
}

module.exports = {
  componentCodes: ['BASIC', 'HRA', 'SPECIAL', 'LTA'],
  deductionCodes: ['PF', 'PT', 'TDS'],
  computePayslip,
};
