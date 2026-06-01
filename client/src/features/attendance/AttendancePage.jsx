import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { usePerms } from "../../hooks/usePerms";

function fmtTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

export default function AttendancePage() {
  const { role, can } = usePerms();
  const isExempt = role === "SUPER_ADMIN";
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [team, setTeam] = useState([]);
  const [tab, setTab] = useState(
    can("attendance.read.all") || isExempt ? "team" : "mine",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    if (can("attendance.mark.self") && !isExempt) {
      api
        .get("/attendance/today")
        .then(({ data }) => setToday(data.entry))
        .catch(() => {});
      api
        .get("/attendance/me")
        .then(({ data }) => setHistory(data.entries))
        .catch(() => {});
    }
    if (can("attendance.read.all")) {
      api
        .get("/attendance/team")
        .then(({ data }) => setTeam(data.rows))
        .catch(() => {});
    }
  }, [tick]);

  const doCheckIn = async () => {
    setError("");
    setBusy(true);
    try {
      await api.post("/attendance/checkin");
      reload();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to check in");
    } finally {
      setBusy(false);
    }
  };
  const doCheckOut = async () => {
    setError("");
    setBusy(true);
    try {
      await api.post("/attendance/checkout");
      reload();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to check out");
    } finally {
      setBusy(false);
    }
  };

  const liveHours = useMemo(() => {
    if (!today?.checkIn) return 0;
    const end = today.checkOut ? new Date(today.checkOut) : new Date();
    return Math.round(((end - new Date(today.checkIn)) / 36e5) * 100) / 100;
  }, [today]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p className="muted">Track time and view your team's presence.</p>
        </div>
      </div>

      {can("attendance.mark.self") && !isExempt && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="kpi-label">Today</div>
              <div className="kpi-value">{liveHours.toFixed(2)}h</div>
              <div className="kpi-foot">
                {today?.checkIn
                  ? `Checked in at ${fmtTime(today.checkIn)}`
                  : "Not checked in"}
                {today?.checkOut
                  ? ` · Checked out at ${fmtTime(today.checkOut)}`
                  : ""}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {!today?.checkIn && (
              <button
                className="btn primary"
                onClick={doCheckIn}
                disabled={busy}
              >
                {busy ? "…" : "Check in"}
              </button>
            )}
            {today?.checkIn && !today?.checkOut && (
              <button
                className="btn primary"
                onClick={doCheckOut}
                disabled={busy}
              >
                {busy ? "…" : "Check out"}
              </button>
            )}
            {today?.checkOut && (
              <span className="badge active">Day completed</span>
            )}
          </div>
          {error && (
            <div className="error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>
      )}

      <div className="tabs-row">
        {can("attendance.read.all") && (
          <button
            className={`btn ${tab === "team" ? "primary" : ""}`}
            onClick={() => setTab("team")}
          >
            Today's Team
          </button>
        )}
        {can("attendance.mark.self") && !isExempt && (
          <button
            className={`btn ${tab === "mine" ? "primary" : ""}`}
            onClick={() => setTab("mine")}
          >
            My History
          </button>
        )}
      </div>

      {tab === "team" && can("attendance.read.all") && (
        <div className="card table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty">
                    No employees to show.
                  </td>
                </tr>
              ) : (
                team.map(({ employee, entry }) => (
                  <tr key={employee._id}>
                    <td>
                      <div className="cell-employee">
                        <div className="avatar small">
                          {(employee.name || "?")
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="cell-name">{employee.name}</div>
                          <div className="cell-sub">{employee.empCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>{employee.department || "—"}</td>
                    <td>{fmtTime(entry?.checkIn)}</td>
                    <td>{fmtTime(entry?.checkOut)}</td>
                    <td>{entry?.hours ? `${entry.hours.toFixed(2)}h` : "—"}</td>
                    <td>
                      {entry?.checkIn && !entry?.checkOut && (
                        <span className="badge warn">Working</span>
                      )}
                      {entry?.checkOut && (
                        <span className="badge active">Done</span>
                      )}
                      {!entry?.checkIn && (
                        <span className="badge exited">Absent</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "mine" && !isExempt && (
        <div className="card table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                history.map((e) => (
                  <tr key={e._id}>
                    <td>{fmtDate(e.date)}</td>
                    <td>{fmtTime(e.checkIn)}</td>
                    <td>{fmtTime(e.checkOut)}</td>
                    <td>{e.hours ? `${e.hours.toFixed(2)}h` : "—"}</td>
                    <td>
                      <span
                        className={`badge ${e.status === "PRESENT" ? "active" : "warn"}`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
