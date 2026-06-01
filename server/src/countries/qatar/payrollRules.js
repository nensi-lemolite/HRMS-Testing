// Qatar payroll: no personal income tax. Main statutory item is End-of-Service Gratuity.

// End-of-Service: minimum 3 weeks of basic wage per year of service after 1 year completed.
function calcEndOfServiceAccrual(basicMonthly) {
  // Monthly accrual for the gratuity fund (3 weeks per year => 21 days / 365 of annual basic)
  const annualBasic = basicMonthly * 12;
  const annualAccrual = (annualBasic * 21) / 365;
  return Math.round(annualAccrual / 12);
}

function computePayslip({ components }) {
  const basic = Number(components.basic || 0);
  const housing = Number(components.housing || 0);
  const transport = Number(components.transport || 0);
  const other = Number(components.other || 0);

  const gross = basic + housing + transport + other;

  const earnings = [
    { code: 'BASIC', label: 'Basic', amount: basic },
    { code: 'HOUSING', label: 'Housing Allowance', amount: housing },
    { code: 'TRANSPORT', label: 'Transport Allowance', amount: transport },
    { code: 'OTHER', label: 'Other Allowance', amount: other },
  ];

  // No statutory deductions for Qatari nationals/expats under Labour Law.
  const deductions = [];
  const totalDeduction = 0;
  const net = gross - totalDeduction;
  const eosAccrual = calcEndOfServiceAccrual(basic);

  return { earnings, deductions, gross, totalDeduction, net, eosAccrual };
}

module.exports = {
  componentCodes: ['BASIC', 'HOUSING', 'TRANSPORT', 'OTHER'],
  deductionCodes: [],
  computePayslip,
  calcEndOfServiceAccrual,
};
