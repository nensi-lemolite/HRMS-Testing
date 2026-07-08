import { useState, useEffect, useMemo } from 'react';
import '../gamification/gamification.css';
import { useCelebrate } from '../gamification/celebrate.jsx';
import { usePerms } from '../../hooks/usePerms';
import api from '../../api/client';
import * as papi from '../../api/projects';

const STATUS = {
  ACTIVE: { t: 'Active', c: 'active' },
  ON_HOLD: { t: 'On hold', c: 'warn' },
  COMPLETED: { t: 'Completed', c: '' },
};

const memberList = (arr) =>
  (arr || []).map((m) => (typeof m === 'object' && m
    ? { id: String(m._id || m.id), name: m.name || '' }
    : { id: String(m), name: '' }));

const normalize = (p) => ({
  id: String(p._id),
  name: p.name,
  client: p.client || '',
  status: p.status || 'ACTIVE',
  tech: p.tech || [],
  members: memberList(p.members),
});

export default function ProjectsPage() {
  const { can } = usePerms();
  const { celebrate, Toast } = useCelebrate();
  const canEdit = can('projects.write');

  const [rows, setRows] = useState(null);
  const [state, setState] = useState('loading');
  const [employees, setEmployees] = useState([]);
  const [draft, setDraft] = useState(null); // { mode, id, name, client, status, tech, memberIds, members, search }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    papi.listProjects()
      .then((ps) => { setRows(ps.map(normalize)); setState('ready'); })
      .catch(() => setState('error'));
    // Employees power both the assign picker and the bench calculation.
    api.get('/employees')
      .then(({ data }) => setEmployees((data.employees || []).filter((e) => e.status !== 'EXITED')))
      .catch(() => {});
  }, []);

  const pickerList = useMemo(
    () => employees.map((e) => ({ id: String(e._id), name: e.name, label: e.name + (e.department ? ` · ${e.department}` : '') })),
    [employees]
  );

  const empName = (id) =>
    pickerList.find((o) => o.id === id)?.name ||
    (draft?.members || []).find((m) => m.id === id)?.name || 'Member';

  function openNew() {
    setDraft({ mode: 'new', id: null, name: '', client: '', status: 'ACTIVE', tech: '', memberIds: [], members: [], search: '' });
  }
  function openEdit(row) {
    setDraft({
      mode: 'edit', id: row.id, name: row.name, client: row.client, status: row.status,
      tech: row.tech.join(', '), memberIds: row.members.map((m) => m.id), members: row.members, search: '',
    });
  }
  function toggleMember(id) {
    setDraft((d) => ({
      ...d,
      memberIds: d.memberIds.includes(id) ? d.memberIds.filter((x) => x !== id) : [...d.memberIds, id],
    }));
  }
  function rowFrom(d, id) {
    return {
      id,
      name: d.name.trim(),
      client: d.client.trim(),
      status: d.status,
      tech: d.tech.split(',').map((s) => s.trim()).filter(Boolean),
      members: d.memberIds.map((mid) => ({ id: mid, name: empName(mid) })),
    };
  }

  async function save() {
    if (!draft.name.trim()) return;
    const payload = {
      name: draft.name.trim(),
      client: draft.client.trim(),
      status: draft.status,
      tech: draft.tech.split(',').map((s) => s.trim()).filter(Boolean),
      members: draft.memberIds,
    };
    setSaving(true);
    try {
      if (draft.mode === 'edit') {
        await papi.updateProject(draft.id, payload);
        setRows(rows.map((r) => (r.id === draft.id ? rowFrom(draft, draft.id) : r)));
        celebrate('Project updated 🧩');
      } else {
        const p = await papi.createProject(payload);
        setRows([rowFrom(draft, String(p._id)), ...(rows || [])]);
        celebrate('Project added 🧩');
      }
      setDraft(null);
    } catch (e) {
      celebrate(e?.response?.data?.error || 'Could not save project');
    } finally {
      setSaving(false);
    }
  }

  if (state === 'error') return <div className="empty">Couldn’t load projects.</div>;
  if (state === 'loading' || !rows) return <div className="empty">Loading…</div>;

  const count = (s) => rows.filter((r) => r.status === s).length;

  // Bench = active employees not a member of any ACTIVE project.
  const activeMemberIds = new Set(
    rows.filter((r) => r.status === 'ACTIVE').flatMap((r) => r.members.map((m) => m.id))
  );
  const benchList = employees.filter((e) => e.status === 'ACTIVE' && !activeMemberIds.has(String(e._id)));

  const kpis = [
    { l: 'Total projects', v: rows.length },
    { l: 'Active', v: count('ACTIVE') },
    { l: 'On bench', v: benchList.length },
    { l: 'Completed', v: count('COMPLETED') },
  ];

  const pickerFiltered = draft
    ? pickerList.filter((o) => o.label.toLowerCase().includes(draft.search.toLowerCase()))
    : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects &amp; bench</h1>
          <p className="muted">Allocation, status and team assignment across delivery teams.</p>
        </div>
        {canEdit && <button className="btn primary" onClick={openNew}>＋ New project</button>}
      </div>

      <div className="kpi-row">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.l}>
            <div className="kpi-label">{k.l}</div>
            <div className="kpi-value">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Project</th><th>Client</th><th>Team</th><th>Stack</th><th>Status</th>
              {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={canEdit ? 6 : 5}><div className="empty small">No projects yet.{canEdit ? ' Click “New project” to add one.' : ''}</div></td></tr>
            ) : (
              rows.map((p) => {
                const st = STATUS[p.status] || STATUS.ACTIVE;
                const stack = p.tech.join(' · ');
                return (
                  <tr key={p.id}>
                    <td className="cell-name">{p.name}</td>
                    <td>{p.client || '—'}</td>
                    <td>
                      {p.members.length === 0 ? <span className="muted">—</span> : (
                        <span className="chips">
                          {p.members.slice(0, 3).map((m) => (
                            <span className="chip" key={m.id}>{m.name || empName(m.id)}</span>
                          ))}
                          {p.members.length > 3 && <span className="chip">+{p.members.length - 3}</span>}
                        </span>
                      )}
                    </td>
                    <td>{stack ? <span className="tag-pill">{stack}</span> : '—'}</td>
                    <td><span className={'badge ' + st.c}>{st.t}</span></td>
                    {canEdit && (
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn ghost" onClick={() => openEdit(p)}>Edit</button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: '22px 0 12px' }}>On bench — not on an active project</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Engineer</th><th>Primary skills</th><th>Department</th><th>Availability</th></tr></thead>
          <tbody>
            {benchList.length === 0 ? (
              <tr><td colSpan="4"><div className="empty small">No one on the bench — everyone active is assigned to a project.</div></td></tr>
            ) : (
              benchList.map((e) => {
                const skills = (e.skills?.length ? e.skills : e.technologyStack || []).join(', ');
                const initials = (e.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={e._id}>
                    <td className="cell-employee"><span className="gm-avatar">{initials}</span><span className="cell-name">{e.name}</span></td>
                    <td>{skills || '—'}</td>
                    <td>{e.department || '—'}</td>
                    <td><span className="badge active">Available</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, calc(100vw - 32px))' }}>
            <div className="modal-icon info">🧩</div>
            <h2 style={{ marginBottom: 6 }}>{draft.mode === 'edit' ? 'Edit project' : 'New project'}</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>Set the status and assign your delivery team.</p>
            <div className="form">
              <label>Project name
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Payroll revamp" />
              </label>
              <div className="form-grid">
                <label>Client
                  <input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Acme Corp" />
                </label>
                <label>Status
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>
              </div>
              <label>Tech stack (comma-separated)
                <input value={draft.tech} onChange={(e) => setDraft({ ...draft, tech: e.target.value })} placeholder="Node, React, AWS" />
              </label>

              <div>
                <label style={{ marginBottom: 8 }}>Team members</label>
                <div className="chips" style={{ marginBottom: 8 }}>
                  {draft.memberIds.length === 0
                    ? <span className="muted small">No one assigned yet</span>
                    : draft.memberIds.map((id) => (
                        <span key={id} className="chip" style={{ cursor: 'pointer' }} onClick={() => toggleMember(id)} title="Remove">
                          {empName(id)} ✕
                        </span>
                      ))}
                </div>
                <input
                  className="input"
                  placeholder="Search employees…"
                  value={draft.search}
                  onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                />
                <div style={{ maxHeight: 176, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginTop: 6 }}>
                  {pickerFiltered.length === 0 ? (
                    <div className="empty small">{pickerList.length === 0 ? 'No employees to assign.' : 'No matches.'}</div>
                  ) : (
                    pickerFiltered.map((o) => (
                      <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 13.5, color: 'var(--text)' }}>
                        <input type="checkbox" checked={draft.memberIds.includes(o.id)} onChange={() => toggleMember(o.id)} style={{ width: 'auto' }} />
                        {o.label}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={saving || !draft.name.trim()}>
                {saving ? 'Saving…' : draft.mode === 'edit' ? 'Save changes' : 'Add project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {Toast}
    </>
  );
}
