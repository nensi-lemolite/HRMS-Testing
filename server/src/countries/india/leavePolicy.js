module.exports = {
  types: [
    { code: 'CL', name: 'Casual Leave', annualQuota: 12, carryForward: 0 },
    { code: 'SL', name: 'Sick Leave', annualQuota: 7, carryForward: 0 },
    { code: 'EL', name: 'Earned Leave', annualQuota: 18, carryForward: 30 },
    { code: 'ML', name: 'Maternity Leave', annualQuota: 182, carryForward: 0 },
  ],
  weeklyOff: [0],  // Sunday
  probationLeaveAllowed: false,
};
