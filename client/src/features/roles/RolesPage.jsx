import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { usePerms } from '../../hooks/usePerms';

export default function RolesPage() {
  const { refresh } = useAuth();
  const { can } = usePerms();
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userCounts, setUserCounts] = useState({});
  const [tick, setTick] = useState(0);

  const [editingRole, setEditingRole] = useState(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ key: '', label: '', description: '', permissions: [] });
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    api.get('/roles/catalog').then(({ data }) => {
      setPermissionsCatalog(data.permissions);
      setRoles(data.roles);
    }).catch(() => {});
    api.get('/roles/users').then(({ data }) => {
      const counts = {};
      (data.users || []).forEach((u) => {
        counts[u.role] = (counts[u.role] || 0) + 1;
      });
      setUserCounts(counts);
    }).catch(() => {});
  }, [tick]);

  const groupedPerms = useMemo(() => {
    const m = new Map();
    permissionsCatalog.forEach((p) => {
      const group = p.key.split('.')[0];
      if (!m.has(group)) m.set(group, []);
      m.get(group).push(p);
    });
    return [...m.entries()];
  }, [permissionsCatalog]);

  const openNewRole = () => {
    setRoleError('');
    setEditingRole(null);
    setRoleForm({ key: '', label: '', description: '', permissions: [] });
    setShowNewRole(true);
  };
  const openEditRole = (r) => {
    setRoleError('');
    setEditingRole(r);
    setRoleForm({
      key: r.key,
      label: r.label,
      description: r.description || '',
      permissions: r.permissions || [],
    });
    setShowNewRole(true);
  };
  const closeRoleForm = () => {
    setShowNewRole(false);
    setEditingRole(null);
    setRoleError('');
  };

  const togglePerm = (key) => {
    setRoleForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((k) => k !== key)
        : [...f.permissions, key],
    }));
  };
  const toggleGroup = (groupPerms) => {
    const allKeys = groupPerms.map((p) => p.key);
    const allSelected = allKeys.every((k) => roleForm.permissions.includes(k));
    setRoleForm((f) => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter((k) => !allKeys.includes(k))
        : [...new Set([...f.permissions, ...allKeys])],
    }));
  };

  const saveRole = async (e) => {
    e.preventDefault();
    setRoleError('');
    setRoleSaving(true);
    try {
      if (editingRole) {
        await api.patch(`/roles/${editingRole._id}`, roleForm);
      } else {
        await api.post('/roles', roleForm);
      }
      closeRoleForm();
      setTick((t) => t + 1);
      await refresh();
    } catch (err) {
      setRoleError(err.response?.data?.error || 'Failed to save');
    } finally {
      setRoleSaving(false);
    }
  };

  const deleteRole = async (r) => {
    if (!confirm(`Delete role "${r.label}"?`)) return;
    try {
      await api.delete(`/roles/${r._id}`);
      setTick((t) => t + 1);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (!roles.length) return <div className="empty">Loading…</div>;

  const totalUsers = Object.values(userCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Roles &amp; Permissions</h1>
          <p className="muted">
            Define what each role can do. Assign roles to people from the{' '}
            <Link to="/employees" className="link-muted">Employees</Link> module.
          </p>
        </div>
        {can('roles.write') && (
          <button className="btn primary" onClick={openNewRole}>+ Add Role</button>
        )}
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card gradient">
          <div className="kpi-label">Total roles</div>
          <div className="kpi-value">{roles.length}</div>
          <div className="kpi-foot">{roles.filter((r) => r.isSystem).length} system · {roles.filter((r) => !r.isSystem).length} custom</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total accounts</div>
          <div className="kpi-value">{totalUsers}</div>
          <div className="kpi-foot">With sign-in access</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Permissions</div>
          <div className="kpi-value">{permissionsCatalog.length}</div>
          <div className="kpi-foot">In the catalog</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Most assigned</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace('_', ' ') || '—'}
          </div>
          <div className="kpi-foot">
            {Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} people
          </div>
        </div>
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
              <th>Permissions</th>
              <th>Assigned to</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const count = userCounts[r.key] || 0;
              return (
                <tr key={r._id}>
                  <td>
                    <div className="cell-name">
                      {r.label}{' '}
                      {r.isSystem && (
                        <span className="tag-pill" style={{ marginLeft: 6, fontSize: 10 }}>
                          System
                        </span>
                      )}
                    </div>
                    <div className="cell-sub"><code>{r.key}</code></div>
                  </td>
                  <td className="muted small">{r.description || '—'}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{r.permissions?.length || 0}</span>
                    <span className="muted small"> / {permissionsCatalog.length}</span>
                  </td>
                  <td>
                    {count > 0 ? (
                      <Link to="/employees" className="tag-pill" style={{ cursor: 'pointer' }}>
                        {count} {count === 1 ? 'person' : 'people'}
                      </Link>
                    ) : (
                      <span className="muted small">Nobody yet</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {can('roles.write') && (
                        <button
                          className="row-icon-btn"
                          title="Edit"
                          onClick={() => openEditRole(r)}
                        >
                          ✎
                        </button>
                      )}
                      {can('roles.write') && !r.isSystem && (
                        <button
                          className="row-icon-btn danger"
                          title="Delete"
                          onClick={() => deleteRole(r)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNewRole && (
        <div className="modal-backdrop" onClick={() => !roleSaving && closeRoleForm()}>
          <form
            className="modal"
            style={{ width: 'min(720px, calc(100vw - 32px))', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveRole}
          >
            <div className="modal-icon info">🛡</div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>
              {editingRole ? `Edit role · ${editingRole.label}` : 'Add new role'}
            </h2>
            <p className="muted small" style={{ margin: '0 0 14px' }}>
              Choose which permissions this role can perform.
            </p>
            {roleError && <div className="error" style={{ marginBottom: 12 }}>{roleError}</div>}

            <div className="form">
              <div className="form-grid">
                <label>Key (uppercase, unique)
                  <input
                    value={roleForm.key}
                    disabled={!!(editingRole && editingRole.isSystem)}
                    onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
                    placeholder="Enter key"
                    required
                  />
                </label>
                <label>Label
                  <input
                    value={roleForm.label}
                    onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                    placeholder="Enter label"
                    required
                  />
                </label>
              </div>
              <label>Description
                <textarea
                  rows={2}
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </label>

              <h3 style={{ fontSize: 14, marginTop: 12 }}>Permissions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groupedPerms.map(([group, perms]) => {
                  const allKeys = perms.map((p) => p.key);
                  const all = allKeys.every((k) => roleForm.permissions.includes(k));
                  return (
                    <div key={group} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{group}</div>
                        <button type="button" className="btn ghost" onClick={() => toggleGroup(perms)}>
                          {all ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                        {perms.map((p) => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text)' }}>
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(p.key)}
                              onChange={() => togglePerm(p.key)}
                            />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" className="btn" onClick={closeRoleForm} disabled={roleSaving}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={roleSaving}>
                {roleSaving ? 'Saving…' : editingRole ? 'Save changes' : 'Create role'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
