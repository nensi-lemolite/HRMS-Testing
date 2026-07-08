import { useState, useEffect } from 'react';
import '../gamification/gamification.css';
import { useCelebrate } from '../gamification/celebrate.jsx';
import { usePerms } from '../../hooks/usePerms';
import { projects as demoProjects, bench } from '../gamification/data';
import * as papi from '../../api/projects';

const STATUS = {
  ACTIVE: { t: 'Active', c: 'active' },
  ON_HOLD: { t: 'On hold', c: 'warn' },
  COMPLETED: { t: 'Completed', c: '' },
};

const normalizeLive = (p) => ({
  name: p.name,
  client: p.client || '—',
  team: (p.members || []).length,
  stack: (p.tech || []).join(' · ') || '—',
  statusText: (STATUS[p.status] || STATUS.ACTIVE).t,
  statusCls: (STATUS[p.status] || STATUS.ACTIVE).c,
});
const normalizeDemo = (p) => ({
  name: p.name,
  client: p.client,
  team: p.team,
  stack: p.stack,
  statusText: p.status,
  statusCls: p.status === 'On track' ? 'active' : 'warn',
});

export default function ProjectsPage({ demo }) {
  const { can } = usePerms();
  const { celebrate, Toast } = useCelebrate();
  const [rows, setRows] = useState(demo ? demoProjects.map(normalizeDemo) : null);
  const [state, setState] = useState(demo ? 'ready' : 'loading');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const canAdd = demo || can('projects.write');

  useEffect(() => {
    if (demo) return;
    papi.listProjects()
      .then((ps) => { setRows(ps.map(normalizeLive)); setState('ready'); })
      .catch(() => setState('error'));
  }, [demo]);

  function openForm() { setForm({ name: '', client: '', tech: '', status: 'ACTIVE' }); }

  async function save() {
    if (!form.name.trim()) return;
    const tech = form.tech.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = { name: form.name.trim(), client: form.client.trim(), tech, status: form.status };

    if (demo) {
      setRows([{ name: payload.name, client: payload.client || '—', team: 0, stack: tech.join(' · ') || '—', statusText: STATUS[payload.status].t, statusCls: STATUS[payload.status].c }, ...rows]);
      setForm(null);
      return celebrate('Project added 🧩');
    }
    setSaving(true);
    try {
      const p = await papi.createProject(payload);
      setRows([normalizeLive(p), ...(rows || [])]);
      setForm(null);
      celebrate('Project added 🧩');
    } catch (e) {
      celebrate(e?.response?.data?.message || 'Could not add project');
    } finally {
      setSaving(false);
    }
  }

  if (state === 'error') return <div className="empty">Couldn’t load projects.</div>;
  if (state === 'loading' || !rows) return <div className="empty">Loading…</div>;

  const activeCount = demo ? 11 : rows.filter((r) => r.statusText === 'Active').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Projects &amp; bench</h1>
          <p className="muted">Allocation, utilization and bench across delivery teams.</p>
        </div>
        {canAdd && <button className="btn primary" onClick={openForm}>＋ New project</button>}
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><div className="kpi-label">Active projects</div><div className="kpi-value">{activeCount}</div></div>
        <div className="kpi-card"><div className="kpi-label">Billable</div><div className="kpi-value">82%</div><div className="kpi-foot">▲ 4%</div></div>
        <div className="kpi-card"><div className="kpi-label">On bench</div><div className="kpi-value">{demo ? 14 : bench.length}</div><div className="kpi-foot">avg 9 days</div></div>
        <div className="kpi-card"><div className="kpi-label">Utilization</div><div className="kpi-value">88%</div></div>
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Project</th><th>Client</th><th>Team</th><th>Stack</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="5"><div className="empty small">No projects yet.{canAdd ? ' Click “New project” to add one.' : ''}</div></td></tr>
            ) : (
              rows.map((p, i) => (
                <tr key={i}>
                  <td className="cell-name">{p.name}</td>
                  <td>{p.client}</td>
                  <td>{p.team}</td>
                  <td>{p.stack !== '—' ? <span className="tag-pill">{p.stack}</span> : '—'}</td>
                  <td><span className={'badge ' + p.statusCls}>{p.statusText}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: '22px 0 12px' }}>On bench — ready to allocate</h2>
      <div className="card table-card">
        <table className="modern-table">
          <thead><tr><th>Engineer</th><th>Primary skills</th><th>Bench since</th><th>Availability</th></tr></thead>
          <tbody>
            {bench.map((b) => (
              <tr key={b.name}>
                <td className="cell-employee"><span className="gm-avatar">{b.initials}</span><span className="cell-name">{b.name}</span></td>
                <td>{b.skills}</td>
                <td>{b.since}</td>
                <td><span className="badge active">{b.avail}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon info">🧩</div>
            <h2 style={{ marginBottom: 6 }}>New project</h2>
            <p className="muted" style={{ margin: '0 0 16px' }}>Add a delivery project for your teams.</p>
            <div className="form">
              <label>Project name
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Payroll revamp" />
              </label>
              <div className="form-grid">
                <label>Client
                  <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Acme Corp" />
                </label>
                <label>Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>
              </div>
              <label>Tech stack (comma-separated)
                <input value={form.tech} onChange={(e) => setForm({ ...form, tech: e.target.value })} placeholder="Node, React, AWS" />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? 'Adding…' : 'Add project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {Toast}
    </>
  );
}
