function isAttendanceExempt(user) {
  return user?.role === 'SUPER_ADMIN';
}

module.exports = { isAttendanceExempt };
