// Qatar-specific compliance — QID, visa, WPS (Wage Protection System)

function validateQID(value) {
  if (!value) return false;
  // QID is 11 digits, starts with the century digit (2 or 3)
  return /^[23]\d{10}$/.test(String(value));
}

function buildWPSRecord({ employee, payslip, employerId }) {
  // Simplified SIF (Salary Information File) row — Qatar WPS expects fixed-width format.
  // Real implementation should produce a .sif/.csv per QCB spec.
  return {
    employerId,
    employeeQID: employee.countrySpecific?.qid,
    employeeName: employee.name,
    bankIban: employee.bankDetails?.iban,
    salary: payslip.net,
    currency: 'QAR',
    period: payslip.period,
  };
}

module.exports = {
  identifiers: ['QID', 'Passport', 'Visa'],
  validators: { validateQID },
  statutoryOutputs: ['WPS SIF File'],
  buildWPSRecord,
};
