module.exports = {
  code: 'QAR',
  symbol: '﷼',
  locale: 'ar-QA',
  format(amount) {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'QAR',
      maximumFractionDigits: 2,
    }).format(amount);
  },
};
