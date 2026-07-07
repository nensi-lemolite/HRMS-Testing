const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');
const { UPLOAD_ROOT } = require('./middleware/upload');
const { backfillSystemRolePerms, backfillEmployeesForOrphanUsers } = require('./utils/seedCompany');

const authRoutes = require('./modules/auth/auth.routes');
const employeeRoutes = require('./modules/employee/employee.routes');
const countryRoutes = require('./modules/country/country.routes');
const roleRoutes = require('./modules/role/role.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const leaveRoutes = require('./modules/leave/leave.routes');
const payrollRoutes = require('./modules/payroll/payroll.routes');
const reportRoutes = require('./modules/report/report.routes');
const documentRoutes = require('./modules/document/document.routes');
const assetRoutes = require('./modules/asset/asset.routes');
const projectRoutes = require('./modules/project/project.routes');
const performanceRoutes = require('./modules/performance/performance.routes');
const exitRoutes = require('./modules/exit/exit.routes');
const salaryRoutes = require('./modules/salary/salary.routes');
const referralRoutes = require('./modules/referral/referral.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const gamificationRoutes = require('./modules/gamification/gamification.routes');

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(UPLOAD_ROOT));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/exit', exitRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/gamification', gamificationRoutes);

// Serve the built React client from this same server (single-origin deploy).
// API and upload routes are handled above; everything else falls back to the
// SPA's index.html so client-side routing works on full-page loads/refreshes.
if (env.serveClient) {
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDB(env.mongoUri);
    await backfillSystemRolePerms().catch((e) => console.warn('[seed] role backfill failed', e));
    await backfillEmployeesForOrphanUsers().catch((e) =>
      console.warn('[seed] orphan-user backfill failed', e)
    );
    app.listen(env.port, () => console.log(`[server] http://localhost:${env.port}`));
  } catch (err) {
    console.error('[server] startup failed', err);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
