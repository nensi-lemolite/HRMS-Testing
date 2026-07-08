import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

import LoginPage from '../features/auth/LoginPage';
import RegisterCompanyPage from '../features/auth/RegisterCompanyPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import EmployeesPage from '../features/employees/EmployeesPage';
import EmployeeFormPage from '../features/employees/EmployeeFormPage';
import EmployeeDetailPage from '../features/employees/EmployeeDetailPage';
import AttendancePage from '../features/attendance/AttendancePage';
import AssetsPage from '../features/assets/AssetsPage';
import LeavePage from '../features/leave/LeavePage';
import PayrollPage from '../features/payroll/PayrollPage';
import PayrollRunPage from '../features/payroll/PayrollRunPage';
import ReportsPage from '../features/reports/ReportsPage';
import RolesPage from '../features/roles/RolesPage';
import SettingsPage from '../features/settings/SettingsPage';
import ReferralsPage from '../features/referrals/ReferralsPage';
import MySpacePage from '../features/gamification/MySpacePage';
import AchievementsPage from '../features/gamification/AchievementsPage';
import LeaderboardPage from '../features/gamification/LeaderboardPage';
import RewardsStorePage from '../features/gamification/RewardsStorePage';
import RewardsAdminPage from '../features/gamification/RewardsAdminPage';
import ProjectsPage from '../features/projects/ProjectsPage';
import OffboardingPage from '../features/exit/OffboardingPage';
import PerformancePage from '../features/performance/PerformancePage';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterCompanyPage />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="me" element={<MySpacePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/new" element={<EmployeeFormPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/:id" element={<PayrollRunPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="offboarding" element={<OffboardingPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="rewards" element={<RewardsStorePage />} />
        <Route path="rewards-admin" element={<RewardsAdminPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
