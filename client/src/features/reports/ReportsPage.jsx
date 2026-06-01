import { useEffect, useState } from 'react';
import api from '../../api/client';

function fmt(n) {
  return new Intl.NumberFormat().format(n || 0);
}
function pct(part, whole) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

const RANGES = [7, 30, 90];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState(null);
  const [range, setRange] = useState(30);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    api.get('/reports/overview').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setTrendLoading(true);
    api
      .get(`/reports/attendance-trend?days=${range}`)
      .then(({ data }) => setTrend(data))
      .catch(() => {})
      .finally(() => setTrendLoading(false));
  }, [range]);

  if (!data) return <ReportsSkeleton />;

  const { headcount, attendance, leave, byDepartment, recentRuns } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Insights into headcount, attendance, leave, and payroll.</p>
        </div>
      </div>

      {/* Headcount */}
      <h2 className="rep-section-title">Headcount</h2>
      <div className="kpi-row">
        <div className="kpi-card gradient">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{fmt(headcount.total)}</div>
          <div className="kpi-foot">Across all statuses</div>
        </div>
        <KpiCard
          label="Active"
          value={headcount.active}
          color="var(--success)"
          foot={`${pct(headcount.active, headcount.total)}% of workforce`}
        />
        <KpiCard
          label="On Notice"
          value={headcount.onNotice}
          color="var(--warning)"
          foot={`${pct(headcount.onNotice, headcount.total)}% of workforce`}
        />
        <KpiCard
          label="Exited"
          value={headcount.exited}
          color="var(--danger)"
          foot={`${pct(headcount.exited, headcount.total)}% of workforce`}
        />
      </div>

      {/* Today's snapshot */}
      <h2 className="rep-section-title">Today's snapshot</h2>
      <div className="kpi-row">
        <KpiCard
          label="Present Today"
          value={attendance.presentToday}
          foot={`${pct(attendance.presentToday, headcount.active)}% of active`}
        />
        <KpiCard label="Pending Leave" value={leave.pending} foot="Awaiting approval" />
        <KpiCard label="Approved This Month" value={leave.approvedThisMonth} foot="Leave requests" />
        <KpiCard label="Recent Payroll Runs" value={recentRuns?.length || 0} foot="Last 6 periods" />
      </div>

      {/* Attendance trend + composition */}
      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Attendance trend</h2>
            <div className="rep-seg">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={r === range ? 'on' : ''}
                  onClick={() => setRange(r)}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          <AreaChart rows={trend?.rows || []} loading={trendLoading} />
          {trend?.rows?.length > 0 && (
            <div className="rep-legend">
              <Legend color="var(--primary)" label="Present" />
              <Legend color="var(--warning)" label="On leave" />
              <Legend color="var(--danger)" label="Absent" />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Workforce composition</h2>
          </div>
          <CompositionDonut headcount={headcount} />
        </div>
      </div>

      {/* Department + payroll */}
      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Workforce by department</h2>
          </div>
          <div className="bars">
            {byDepartment.length === 0 ? (
              <div className="empty small">No data.</div>
            ) : (
              byDepartment.map((d) => (
                <div key={d.department} className="bar-row">
                  <div className="bar-label">
                    <span>{d.department}</span>
                    <span className="muted">
                      {d.count} · {pct(d.count, headcount.total)}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct(d.count, headcount.total)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Recent payroll</h2>
          </div>
          {recentRuns?.length === 0 ? (
            <div className="empty small">No payroll runs yet.</div>
          ) : (
            <ul className="list">
              {recentRuns?.map((r) => (
                <li key={r._id}>
                  <div className="avatar small">{r.period?.slice(5)}</div>
                  <div className="list-meta">
                    <div className="list-title">
                      {r.period} · {r.country}
                    </div>
                    <div className="list-sub">
                      Net {fmt(r.totals?.net)} · {r.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */

function KpiCard({ label, value, color, foot }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>
        {fmt(value)}
      </div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="rep-legend-item">
      <span className="rep-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

/* SVG area chart for the daily "present" series, with on-leave/absent
   tooltips per point. Uses a non-scaling stroke so the line stays crisp
   when the SVG is stretched to the card width. */
function AreaChart({ rows, loading }) {
  const W = 640;
  const H = 180;
  const P = 10;

  if (loading) return <div className="rep-chart-skeleton" />;
  if (!rows.length) return <div className="empty small">No attendance recorded yet.</div>;

  const max = Math.max(1, ...rows.map((r) => r.present));
  const n = rows.length;
  const x = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - P * 2) + P);
  const y = (v) => H - P - (v / max) * (H - P * 2);

  const line = rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.present).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="rep-area" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="repAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridYs.map((g) => (
        <line
          key={g}
          x1={P}
          x2={W - P}
          y1={(H - P) - g * (H - P * 2)}
          y2={(H - P) - g * (H - P * 2)}
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <path d={area} fill="url(#repAreaFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {rows.map((r, i) => (
        <circle key={r._id} cx={x(i)} cy={y(r.present)} r="3" fill="var(--primary)" vectorEffect="non-scaling-stroke">
          <title>{`${r._id}\nPresent: ${r.present} · On leave: ${r.onLeave} · Absent: ${r.absent}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* Donut for Active / On Notice / Exited. */
function CompositionDonut({ headcount }) {
  const segments = [
    { label: 'Active', value: headcount.active, color: 'var(--success)' },
    { label: 'On Notice', value: headcount.onNotice, color: 'var(--warning)' },
    { label: 'Exited', value: headcount.exited, color: 'var(--danger)' },
  ];
  const total = headcount.total;
  const r = 54;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="rep-donut-wrap">
      <div className="rep-donut">
        <svg viewBox="0 0 140 140" width="150" height="150">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
          {total > 0 &&
            segments.map((s) => {
              const frac = s.value / total;
              const dash = frac * c;
              const seg = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-acc}
                  transform="rotate(-90 70 70)"
                />
              );
              acc += dash;
              return seg;
            })}
        </svg>
        <div className="rep-donut-center">
          <div className="rep-donut-total">{fmt(total)}</div>
          <div className="rep-donut-sub">Employees</div>
        </div>
      </div>
      <div className="rep-donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="rep-donut-legend-row">
            <span className="rep-dot" style={{ background: s.color }} />
            <span className="rep-donut-legend-label">{s.label}</span>
            <span className="rep-donut-legend-val">
              {fmt(s.value)} <span className="muted">({pct(s.value, total)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- skeleton ---------- */
function ReportsSkeleton() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Insights into headcount, attendance, leave, and payroll.</p>
        </div>
      </div>
      <div className="kpi-row" style={{ marginTop: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="rep-skel" style={{ width: '40%', height: 12 }} />
            <div className="rep-skel" style={{ width: '60%', height: 28, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="two-col" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="rep-chart-skeleton" />
        </div>
        <div className="card">
          <div className="rep-chart-skeleton" />
        </div>
      </div>
    </div>
  );
}
