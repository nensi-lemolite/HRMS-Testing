import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePerms } from '../hooks/usePerms';

const NAV = [
  { section: 'Home' },
  // Self-service home is for employees; a SUPER_ADMIN has no employee profile.
  { to: '/me', label: 'My space', icon: '🏠', perm: null, hideForRoles: ['SUPER_ADMIN'] },
  { to: '/', label: 'Dashboard', icon: '⌂', end: true, perm: null },

  { section: 'People' },
  { to: '/employees', label: 'Employees', icon: '👥', perm: ['employees.read.all', 'employees.read.team'] },
  { to: '/attendance', label: 'Attendance', icon: '🕒', perm: ['attendance.mark.self', 'attendance.read.all'] },
  { to: '/leave', label: 'Leave', icon: '🌴', perm: ['leave.apply', 'leave.read.all'] },
  { to: '/payroll', label: 'Payroll', icon: '💰', perm: ['payroll.run', 'payroll.read.all', 'payroll.read.self'] },
  // Plain EMPLOYEEs see their assets inside their own profile, not as a sidebar module.
  { to: '/assets', label: 'Assets', icon: '💻', perm: ['assets.read.all', 'assets.read.self'], hideForRoles: ['EMPLOYEE'] },

  { section: 'Growth' },
  { to: '/projects', label: 'Projects', icon: '🧩', perm: ['projects.read'] },
  { to: '/performance', label: 'Performance', icon: '◎', perm: ['performance.read.all', 'performance.read.self'] },
  { to: '/offboarding', label: 'Offboarding', icon: '↩', perm: ['exit.read.all'], hideForRoles: ['EMPLOYEE'] },

  { section: 'Rewards' },
  // Personal rewards views need an employee profile — hidden for SUPER_ADMIN.
  { to: '/achievements', label: 'Achievements', icon: '🏆', perm: null, hideForRoles: ['SUPER_ADMIN'] },
  { to: '/leaderboard', label: 'Leaderboard', icon: '📊', perm: null },
  { to: '/rewards', label: 'Rewards store', icon: '🎁', perm: null, hideForRoles: ['SUPER_ADMIN'] },
  { to: '/rewards-admin', label: 'Rewards admin', icon: '🎮', perm: null, hideForRoles: ['EMPLOYEE', 'MANAGER'] },

  { section: 'More' },
  { to: '/reports', label: 'Reports', icon: '📈', perm: ['reports.read.all', 'reports.read.team'] },
  { to: '/referrals', label: 'Referrals', icon: '🤝', perm: ['referrals.refer', 'referrals.read.self', 'referrals.read.all'] },
  { to: '/roles', label: 'Roles', icon: '🛡', perm: ['roles.read'] },
  { to: '/settings', label: 'Settings', icon: '⚙', perm: ['settings.read'] },
];

export default function Layout() {
  const { user, company, logout } = useAuth();
  const { canAny } = usePerms();
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const linkVisible = (item) => {
    if (item.hideForRoles?.includes(user?.role)) return false;
    return !item.perm || canAny(...item.perm);
  };
  // Keep section headers only when at least one link under them is visible.
  const visibleNav = [];
  for (let i = 0; i < NAV.length; i++) {
    const item = NAV[i];
    if (item.section) {
      let any = false;
      for (let j = i + 1; j < NAV.length && !NAV[j].section; j++) {
        if (linkVisible(NAV[j])) { any = true; break; }
      }
      if (any) visibleNav.push(item);
    } else if (linkVisible(item)) {
      visibleNav.push(item);
    }
  }

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
          {visibleNav.map((item, idx) =>
            item.section ? (
              <div className="nav-section" key={'sec-' + idx}>{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
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
