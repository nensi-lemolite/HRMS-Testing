module.exports = {
  // Per Qatar Labour Law (Law No. 14 of 2004) — simplified
  types: [
    { code: 'AL', name: 'Annual Leave', annualQuota: 21, carryForward: 21, note: '<5y: 3w, >=5y: 4w' },
    { code: 'SL', name: 'Sick Leave', annualQuota: 14, carryForward: 0 },
    { code: 'CL', name: 'Casual Leave', annualQuota: 5, carryForward: 0 },
    { code: 'ML', name: 'Maternity Leave', annualQuota: 50, carryForward: 0 },
    { code: 'HAJJ', name: 'Hajj Leave', annualQuota: 20, carryForward: 0, oneTime: true },
  ],
  weeklyOff: [5],  // Friday
  probationLeaveAllowed: false,
};
