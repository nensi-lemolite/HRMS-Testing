import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePerms } from '../hooks/usePerms';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true, perm: null },
  { to: '/employees', label: 'Employees', icon: '👥', perm: ['employees.read.all', 'employees.read.team'] },
  { to: '/attendance', label: 'Attendance', icon: '🕒', perm: ['attendance.mark.self', 'attendance.read.all'] },
  // Plain EMPLOYEEs see their assets inside their own profile, not as a
  // sidebar module — Leave keeps its sidebar entry for everyone.
  { to: '/assets', label: 'Assets', icon: '💻', perm: ['assets.read.all', 'assets.read.self'], hideForRoles: ['EMPLOYEE'] },
  { to: '/leave', label: 'Leave', icon: '🌴', perm: ['leave.apply', 'leave.read.all'] },
  { to: '/payroll', label: 'Payroll', icon: '💰', perm: ['payroll.run', 'payroll.read.all', 'payroll.read.self'] },
  { to: '/reports', label: 'Reports', icon: '📊', perm: ['reports.read.all', 'reports.read.team'] },
  { to: '/referrals', label: 'Referrals', icon: '🤝', perm: ['referrals.refer', 'referrals.read.self', 'referrals.read.all'] },
  { to: '/roles', label: 'Roles', icon: '🛡', perm: ['roles.read'] },
  { to: '/settings', label: 'Settings', icon: '⚙', perm: ['settings.read'] },
];

export default function Layout() {
  const { user, company, logout } = useAuth();
  const { canAny } = usePerms();
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const visibleNav = NAV.filter((item) => {
    if (item.hideForRoles?.includes(user?.role)) return false;
    return !item.perm || canAny(...item.perm);
  });

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">HR</div>
          <div className="brand-text">
            <div className="brand-name">{company?.name || 'HRMS'}</div>
            <div className="brand-sub">Workspace</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div className="topbar-search">
            <span className="search-icon">⌕</span>
            <input placeholder="Enter search" />
          </div>
          <div className="topbar-right">
            <button className="icon-btn" title="Notifications">🔔</button>
            {user?.employee ? (
              <Link
                to={`/employees/${user.employee}`}
                className="user-chip"
                title="View my profile"
                style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <div className="avatar">{initials}</div>
                <div className="user-meta">
                  <div className="user-name">{user?.name}</div>
                  <div className="user-role">{user?.role?.replace('_', ' ')}</div>
                </div>
              </Link>
            ) : (
              <div className="user-chip">
                <div className="avatar">{initials}</div>
                <div className="user-meta">
                  <div className="user-name">{user?.name}</div>
                  <div className="user-role">{user?.role?.replace('_', ' ')}</div>
                </div>
              </div>
            )}
            <button className="btn ghost" onClick={logout}>Logout</button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
