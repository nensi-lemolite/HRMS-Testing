import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePerms } from "../../hooks/usePerms";

export default function EmployeesPage() {
  const { user } = useAuth();
  const { can } = usePerms();
  const navigate = useNavigate();
  const canManage = ["SUPER_ADMIN", "HR_ADMIN"].includes(user?.role);
  const canChangeRole = can("roles.write");
  const canToggleActive = can("employees.write");

  if (user?.role === "EMPLOYEE") {
    return user.employee ? (
      <Navigate to={`/employees/${user.employee}`} replace />
    ) : (
      <div className="empty">
        Your account isn't linked to an employee record yet. Contact HR.
      </div>
    );
  }
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL / ACTIVE / INACTIVE
  const [filterDept, setFilterDept] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editingRoleFor, setEditingRoleFor] = useState(null);
  const [savingAccess, setSavingAccess] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get("/employees")
      .then(({ data }) => setEmployees(data.employees))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (canManage) {
      api
        .get("/roles/catalog")
        .then(({ data }) => setRoles(data.roles || []))
        .catch(() => {});
    }
  }, []);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/${deleteTarget._id}`);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const updateAccess = async (emp, body) => {
    setSavingAccess(emp._id);
    try {
      const { data } = await api.patch(`/employees/${emp._id}/access`, body);
      setEmployees((list) =>
        list.map((e) =>
          e._id === emp._id
            ? {
                ...e,
                ...(data.employee || {}),
                login: data.login
                  ? { ...(e.login || {}), ...data.login }
                  : e.login,
              }
            : e,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update");
    } finally {
      setSavingAccess(null);
      setEditingRoleFor(null);
    }
  };

  const departments = useMemo(() => {
    return Array.from(
      new Set(employees.map((e) => e.department).filter(Boolean)),
    ).sort();
  }, [employees]);

  const isActive = (e) => e.status === "ACTIVE";

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (filterStatus === "ACTIVE" && !isActive(e)) return false;
      if (filterStatus === "INACTIVE" && isActive(e)) return false;
      if (filterDept !== "ALL" && e.department !== filterDept) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.empCode?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, search, filterStatus, filterDept]);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter(isActive).length,
      inactive: employees.filter((e) => !isActive(e)).length,
    }),
    [employees],
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="muted">
            Manage your workforce, roles and sign-in access in one place.
          </p>
        </div>
        <Link to="/employees/new" className="btn primary">
          + Add Employee
        </Link>
      </div>

      <div className="kpi-row">
        <div className="kpi-card gradient">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active</div>
          <div className="kpi-value" style={{ color: "var(--success)" }}>
            {stats.active}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Inactive</div>
          <div className="kpi-value" style={{ color: "var(--text-muted)" }}>
            {stats.inactive}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-toolbar">
          <input
            className="input"
            placeholder="Enter search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="ALL">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                {canManage && <th>Role</th>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="empty">
                    No employees match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const login = e.login;
                  const isMe = login && String(login._id) === String(user._id);
                  return (
                    <tr key={e._id}>
                      <td>
                        <div className="cell-employee">
                          {e.profilePhoto ? (
                            <img
                              src={e.profilePhoto}
                              alt={e.name}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid var(--border)",
                              }}
                            />
                          ) : (
                            <div className="avatar small">
                              {(e.name || "?")
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="cell-name">
                              {e.name}
                              {isMe && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    color: "var(--text-muted)",
                                    fontSize: 12,
                                  }}
                                >
                                  (you)
                                </span>
                              )}
                            </div>
                            <div className="cell-sub">
                              {e.empCode} · {e.email || "no email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{e.department || "—"}</td>
                      <td>{e.designation || "—"}</td>
                      {canManage && (
                        <td>
                          {!login ? (
                            <span className="muted small">No account</span>
                          ) : canChangeRole && editingRoleFor === e._id ? (
                            <select
                              defaultValue={login.role}
                              onChange={(ev) =>
                                updateAccess(e, { role: ev.target.value })
                              }
                              onBlur={() => setEditingRoleFor(null)}
                              disabled={savingAccess === e._id}
                              autoFocus
                            >
                              {roles.map((r) => (
                                <option key={r.key} value={r.key}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className="tag-pill"
                              style={{
                                cursor: canChangeRole ? "pointer" : "default",
                                opacity: savingAccess === e._id ? 0.5 : 1,
                              }}
                              onClick={() =>
                                canChangeRole && setEditingRoleFor(e._id)
                              }
                              title={
                                canChangeRole ? "Click to change role" : ""
                              }
                            >
                              {roles.find((r) => r.key === login.role)?.label ||
                                login.role}
                            </span>
                          )}
                        </td>
                      )}
                      <td>
                        {canToggleActive && !isMe ? (
                          <label
                            className="switch"
                            title={
                              isActive(e) ? "Mark inactive" : "Mark active"
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isActive(e)}
                              disabled={savingAccess === e._id}
                              onChange={() =>
                                updateAccess(e, { active: !isActive(e) })
                              }
                            />
                            <span className="switch-slider" />
                          </label>
                        ) : (
                          <span
                            className={`badge ${isActive(e) ? "active" : "exited"}`}
                          >
                            {isActive(e) ? "Active" : "Inactive"}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link className="row-link" to={`/employees/${e._id}`}>
                            View
                          </Link>
                          {canManage && (
                            <>
                              <button
                                className="row-icon-btn"
                                title="Edit"
                                onClick={() =>
                                  navigate(`/employees/${e._id}?edit=1`)
                                }
                              >
                                ✎
                              </button>
                              <button
                                className="row-icon-btn danger"
                                title="Delete"
                                onClick={() => setDeleteTarget(e)}
                              >
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon danger">⚠</div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Delete employee?</h2>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              This permanently removes <b>{deleteTarget.name}</b> and any linked
              sign-in account. This action cannot be undone.
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                className="btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={doDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
