// India-specific compliance validators and identifiers

function validatePAN(value) {
  if (!value) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value).toUpperCase());
}

function validateAadhaar(value) {
  if (!value) return false;
  return /^\d{12}$/.test(String(value).replace(/\s+/g, ''));
}

module.exports = {
  identifiers: ['PAN', 'Aadhaar', 'UAN'],
  validators: { validatePAN, validateAadhaar },
  statutoryForms: ['Form 16', 'Form 24Q'],
};
