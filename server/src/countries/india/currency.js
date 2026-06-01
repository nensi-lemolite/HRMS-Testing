module.exports = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
  format(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  },
};
