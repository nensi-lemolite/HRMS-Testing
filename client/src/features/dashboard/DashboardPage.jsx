import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePerms } from '../../hooks/usePerms';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameMonthDay(a, b) {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function withinNextDays(target, n) {
  if (!target) return false;
  const today = startOfDay(new Date());
  const dt = new Date(target);
  const thisYear = new Date(today.getFullYear(), dt.getMonth(), dt.getDate());
  const next = thisYear < today ? new Date(today.getFullYear() + 1, dt.getMonth(), dt.getDate()) : thisYear;
  const diff = (next - today) / 86400000;
  return diff >= 0 && diff <= n;
}
function daysUntil(target) {
  if (!target) return null;
  const today = startOfDay(new Date());
  const dt = new Date(target);
  const thisYear = new Date(today.getFullYear(), dt.getMonth(), dt.getDate());
  const next = thisYear < today ? new Date(today.getFullYear() + 1, dt.getMonth(), dt.getDate()) : thisYear;
  return Math.round((next - today) / 86400000);
}
function fmtMonthDay(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function yearsSince(d) {
  if (!d) return 0;
  const today = new Date();
  const dt = new Date(d);
  let y = today.getFullYear() - dt.getFullYear();
  const before = today.getMonth() < dt.getMonth() || (today.getMonth() === dt.getMonth() && today.getDate() < dt.getDate());
  if (before) y -= 1;
  return y;
}

export default function DashboardPage() {
  const { user, company } = useAuth();
  const { can, canAny } = usePerms();
  const [employees, setEmployees] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [todaysLeaves, setTodaysLeaves] = useState([]);
  const [myBalance, setMyBalance] = useState(null);

  const isManagerial = canAny('leave.approve.all', 'leave.approve.team', 'employees.read.all');

  useEffect(() => {
    if (canAny('employees.read.all', 'employees.read.team')) {
      api.get('/employees').then(({ data }) => setEmployees(data.employees || [])).catch(() => {});
    }
    if (can('leave.approve.all')) {
      api.get('/leave/pending').then(({ data }) => setPendingLeaves(data.leaves || [])).catch(() => {});
    }
    if (can('leave.read.all')) {
      api.get('/leave/all', { params: { status: 'APPROVED' } })
        .then(({ data }) => setTodaysLeaves(filterTodaysLeaves(data.leaves || [])))
        .catch(() => {});
    }
    if (can('leave.apply')) {
      api.get('/leave/balance/me').then(({ data }) => setMyBalance(data)).catch(() => {});
    }
  }, []);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter((e) => e.status === 'ACTIVE').length,
    onNotice: employees.filter((e) => e.status === 'ON_NOTICE').length,
  }), [employees]);

  // Birthdays in next 14 days
  const birthdays = useMemo(() => {
    return employees
      .filter((e) => e.dob && withinNextDays(e.dob, 14) && e.status === 'ACTIVE')
      .map((e) => ({ ...e, in: daysUntil(e.dob) }))
      .sort((a, b) => a.in - b.in)
      .slice(0, 6);
  }, [employees]);

  // Work anniversaries in next 14 days
  const anniversaries = useMemo(() => {
    return employees
      .filter((e) => e.joinDate && withinNextDays(e.joinDate, 14) && e.status === 'ACTIVE')
      .map((e) => {
        const today = startOfDay(new Date());
        const jd = new Date(e.joinDate);
        const thisYear = new Date(today.getFullYear(), jd.getMonth(), jd.getDate());
        const ann = thisYear < today ? new Date(today.getFullYear() + 1, jd.getMonth(), jd.getDate()) : thisYear;
        const years = ann.getFullYear() - jd.getFullYear();
        return { ...e, in: daysUntil(e.joinDate), years };
      })
      .filter((e) => e.years > 0)
      .sort((a, b) => a.in - b.in)
      .slice(0, 6);
  }, [employees]);

  const balanceTotal = myBalance?.balances
    ? Object.values(myBalance.balances).reduce((a, b) => a + b, 0)
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="muted">
            Here's what's happening at <b>{company?.name}</b> today.
          </p>
        </div>
      </div>

      <div className="kpi-row">
        {isManagerial ? (
          <>
            <div className="kpi-card gradient">
              <div className="kpi-label">Total Employees</div>
              <div className="kpi-value">{stats.total}</div>
              <div className="kpi-foot">{stats.active} active · {stats.onNotice} on notice</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">On leave today</div>
              <div className="kpi-value">{todaysLeaves.length}</div>
              <div className="kpi-foot">{todaysLeaves.length ? 'View who below' : 'All hands on deck'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pending approvals</div>
              <div className="kpi-value" style={{ color: pendingLeaves.length ? 'var(--danger)' : 'var(--text)' }}>
                {pendingLeaves.length}
              </div>
              <div className="kpi-foot">
                {pendingLeaves.length ? (
                  <Link to="/leave" className="link-muted">Review →</Link>
                ) : 'Inbox zero'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Celebrations</div>
              <div className="kpi-value">{birthdays.length + anniversaries.length}</div>
              <div className="kpi-foot">Next 14 days</div>
            </div>
          </>
        ) : (
          <>
            <div className="kpi-card gradient">
              <div className="kpi-label">Leave balance</div>
              <div className="kpi-value">{balanceTotal ?? '—'}</div>
              <div className="kpi-foot">
                {myBalance?.balances
                  ? Object.entries(myBalance.balances).map(([k, v]) => `${k}: ${v}`).join(' · ')
                  : 'Across all types'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Birthdays this fortnight</div>
              <div className="kpi-value">{birthdays.length}</div>
              <div className="kpi-foot">{birthdays.length ? 'See list below' : 'None coming up'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Work anniversaries</div>
              <div className="kpi-value">{anniversaries.length}</div>
              <div className="kpi-foot">Next 14 days</div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Upcoming celebrations</h2>
          <span className="muted small">Next 14 days</span>
        </div>
        {(birthdays.length === 0 && anniversaries.length === 0) ? (
          <div className="empty small">No celebrations coming up.</div>
        ) : (
          <ul className="list">
            {birthdays.map((e) => (
              <li key={`b-${e._id}`}>
                <div className="avatar small" style={{ background: '#fce7f3', color: '#be185d' }}>🎂</div>
                <div className="list-meta">
                  <div className="list-title">{e.name}</div>
                  <div className="list-sub">
                    Birthday · {fmtMonthDay(e.dob)} · {e.in === 0 ? 'today' : e.in === 1 ? 'tomorrow' : `in ${e.in} days`}
                  </div>
                </div>
                <Link to={`/employees/${e._id}`} className="row-link">View</Link>
              </li>
            ))}
            {anniversaries.map((e) => (
              <li key={`a-${e._id}`}>
                <div className="avatar small" style={{ background: '#dbeafe', color: '#1d4ed8' }}>🎉</div>
                <div className="list-meta">
                  <div className="list-title">{e.name}</div>
                  <div className="list-sub">
                    {e.years} year{e.years === 1 ? '' : 's'} · {fmtMonthDay(e.joinDate)} · {e.in === 0 ? 'today' : `in ${e.in} days`}
                  </div>
                </div>
                <Link to={`/employees/${e._id}`} className="row-link">View</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isManagerial && todaysLeaves.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h2>On leave today</h2>
            <Link to="/leave" className="link-muted">All leaves →</Link>
          </div>
          <ul className="list">
            {todaysLeaves.slice(0, 8).map((l) => (
              <li key={l._id}>
                <div className="avatar small">
                  {(l.employee?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="list-meta">
                  <div className="list-title">{l.employee?.name || 'Unknown'}</div>
                  <div className="list-sub">{l.type} · {fmtMonthDay(l.from)} → {fmtMonthDay(l.to)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {can('leave.approve.all') && pendingLeaves.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h2>Pending leave approvals</h2>
            <Link to="/leave" className="link-muted">Open queue →</Link>
          </div>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.slice(0, 5).map((l) => (
                <tr key={l._id}>
                  <td>{l.employee?.name || '—'}</td>
                  <td>
                    <span className="tag-pill">{l.type}</span>
                  </td>
                  <td>{fmtMonthDay(l.from)}</td>
                  <td>{fmtMonthDay(l.to)}</td>
                  <td>{l.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function filterTodaysLeaves(leaves) {
  const today = startOfDay(new Date());
  return leaves.filter((l) => {
    if (!l.from || !l.to) return false;
    const from = startOfDay(new Date(l.from));
    const to = startOfDay(new Date(l.to));
    return today >= from && today <= to && l.status === 'APPROVED';
  });
}
