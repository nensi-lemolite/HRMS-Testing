import { useState, useEffect } from 'react';
import api from '../../api/client';
import { usePerms } from '../../hooks/usePerms';
import { useAuth } from '../../context/AuthContext';
import * as papi from '../../api/performance';

const GOAL_STATUS = { OPEN: 'warn', IN_PROGRESS: 'warn', DONE: 'active', CANCELLED: 'exited' };
const APPR_STATUS = { DRAFT: 'warn', SUBMITTED: 'warn', FINALIZED: 'active' };

function Stars({ n }) {
  const v = Math.round(n || 0);
  return <span style={{ color: 'var(--warning)', letterSpacing: 1 }}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>;
}

export default function PerformancePage() {
  const { can } = usePerms();
  const { user } = useAuth();
  const canAll = can('performance.read.all');
  const canWrite = can('performance.write');

  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState(canAll ? '' : user?.employee || '');
  const [goals, setGoals] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [state, setState] = useState('loading');
  const [goalModal, setGoalModal] = useState(null);
  const [apprModal, setApprModal] = useState(null);

  useEffect(() => {
    if (!canAll) return;
    api.get('/employees').then(({ data }) => {
      const list = (data.employees || []).filter((e) => e.status !== 'EXITED');
      setEmployees(list);
      setEmpId((cur) => cur || (list[0]?._id || ''));
    }).catch(() => {});
  }, [canAll]);

  function load(id) {
    if (!id) { setState('none'); return; }
    setState('loading');
    Promise.all([papi.listGoals(id), papi.listAppraisals(id)])
      .then(([g, a]) => { setGoals(g); setAppraisals(a); setState('ready'); })
      .catch(() => setState('error'));
  }
  useEffect(() => { if (empId) load(empId); }, [empId]);

  async function saveGoal(g) {
    const body = { ...g, employee: empId, completion: Number(g.completion) || 0, weight: Number(g.weight) || 1 };
    if (g._id) await papi.updateGoal(g._id, body); else await papi.createGoal(body);
    setGoalModal(null); load(empId);
  }
  async function removeGoal(id) { await papi.deleteGoal(id); load(empId); }
  async function saveAppraisal(a) {
    const body = { ...a, employee: empId, rating: Number(a.rating) || undefined, kpis: (a.kpis || []).filter((k) => k.name) };
    if (a._id) await papi.updateAppraisal(a._id, body); else await papi.createAppraisal(body);
    setApprModal(null); load(empId);
  }
  async function removeAppraisal(id) { await papi.deleteAppraisal(id); load(empId); }

  const done = goals.filter((g) => g.status === 'DONE').length;
  const inProg = goals.filter((g) => g.status === 'IN_PROGRESS').length;
  const avg = goals.length ? Math.round(goals.reduce((s, g) => s + (g.completion || 0), 0) / goals.length) : 0;
  const latestRating = appraisals.find((a) => a.rating)?.rating;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Performance</h1>
          <p className="muted">Goals, OKRs and appraisal reviews.</p>
        </div>
        {canWrite && empId && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setApprModal({ period: '', rating: 3, status: 'DRAFT', managerFeedback: '', kpis: [] })}>+ Appraisal</button>
            <button className="btn primary" onClick={() => setGoalModal({ title: '', period: '', status: 'OPEN', completion: 0, weight: 1, description: '' })}>+ Goal</button>
          </div>
        )}
      </div>

      {canAll && (
        <div style={{ marginBottom: 16, maxWidth: 320 }}>
          <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.name}{e.department ? ` · ${e.department}` : ''}</option>)}
          </select>
        </div>
      )}

      {state === 'none' && <div className="empty">Select an employee to view performance.</div>}
      {state === 'loading' && <div className="empty">Loading…</div>}
      {state === 'error' && <div className="empty">Couldn’t load performance.</div>}

      {state === 'ready' && (
        <>
          <div className="kpi-row">
            <div className="kpi-card"><div className="kpi-label">Goals</div><div className="kpi-value">{goals.length}</div></div>
            <div className="kpi-card"><div className="kpi-label">In progress</div><div className="kpi-value">{inProg}</div></div>
            <div className="kpi-card"><div className="kpi-label">Completed</div><div className="kpi-value">{done}</div></div>
            <div className="kpi-card"><div className="kpi-label">Avg completion</div><div className="kpi-value">{avg}%</div></div>
          </div>

          <div className="card-head" style={{ marginTop: 20 }}><h2>Goals &amp; OKRs</h2></div>
          {goals.length === 0 ? (
            <div className="card"><div className="empty">No goals yet.{canWrite ? ' Add one to get started.' : ''}</div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {goals.map((g) => (
                <div className="card" key={g._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 600 }}>{g.title}</div>
                    <span className={`badge ${GOAL_STATUS[g.status] || 'warn'}`}>{g.status.replace('_', ' ')}</span>
                  </div>
                  {g.period && <div className="muted small" style={{ marginTop: 2 }}>{g.period}</div>}
                  {g.description && <p className="muted" style={{ fontSize: 13, margin: '8px 0' }}>{g.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '10px 0 5px' }}>
                    <span className="muted">Completion</span><span style={{ fontWeight: 600 }}>{g.completion || 0}%</span>
                  </div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${g.completion || 0}%` }} /></div>
                  {canWrite && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 12 }}>
                      <button className="btn ghost" onClick={() => setGoalModal({ ...g })}>Edit</button>
                      <button className="btn ghost" onClick={() => removeGoal(g._id)}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card-head" style={{ marginTop: 24 }}>
            <h2>Appraisals</h2>
            {latestRating && <span className="muted small">Latest rating: <Stars n={latestRating} /></span>}
          </div>
          {appraisals.length === 0 ? (
            <div className="card"><div className="empty">No appraisals yet.</div></div>
          ) : (
            appraisals.map((a) => (
              <div className="card" key={a._id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <b>{a.period}</b> &nbsp; <Stars n={a.rating} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge ${APPR_STATUS[a.status] || 'warn'}`}>{a.status}</span>
                    {canWrite && <button className="btn ghost" onClick={() => setApprModal({ ...a, kpis: a.kpis || [] })}>Edit</button>}
                    {canWrite && <button className="btn ghost" onClick={() => removeAppraisal(a._id)}>🗑</button>}
                  </div>
                </div>
                {a.managerFeedback && <p style={{ fontSize: 13.5, margin: '10px 0 0' }}>{a.managerFeedback}</p>}
                {a.kpis?.length > 0 && (
                  <table className="modern-table" style={{ marginTop: 12 }}>
                    <thead><tr><th>KPI</th><th>Target</th><th>Achieved</th><th>Score</th></tr></thead>
                    <tbody>
                      {a.kpis.map((k, i) => (
                        <tr key={i}><td>{k.name}</td><td>{k.target || '—'}</td><td>{k.achieved || '—'}</td><td><Stars n={k.score} /></td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </>
      )}

      {goalModal && <GoalModal draft={goalModal} onClose={() => setGoalModal(null)} onSave={saveGoal} />}
      {apprModal && <AppraisalModal draft={apprModal} onClose={() => setApprModal(null)} onSave={saveAppraisal} />}
    </div>
  );
}

function GoalModal({ draft, onClose, onSave }) {
  const [g, setG] = useState(draft);
  const set = (k) => (e) => setG({ ...g, [k]: e.target.value });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, calc(100vw - 32px))' }}>
        <h2 style={{ marginBottom: 12 }}>{g._id ? 'Edit goal' : 'New goal'}</h2>
        <div className="form">
          <label>Title<input value={g.title} onChange={set('title')} placeholder="Ship payroll v2" /></label>
          <div className="form-grid">
            <label>Period<input value={g.period || ''} onChange={set('period')} placeholder="2026-H2" /></label>
            <label>Status
              <select value={g.status} onChange={set('status')}>
                {['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>Completion %<input type="number" min="0" max="100" value={g.completion} onChange={set('completion')} /></label>
            <label>Weight<input type="number" value={g.weight} onChange={set('weight')} /></label>
          </div>
          <label>Description<textarea rows="2" value={g.description || ''} onChange={set('description')} /></label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!g.title.trim()} onClick={() => onSave(g)}>Save goal</button>
        </div>
      </div>
    </div>
  );
}

function AppraisalModal({ draft, onClose, onSave }) {
  const [a, setA] = useState(draft);
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value });
  const setKpi = (i, k, v) => setA({ ...a, kpis: a.kpis.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)) });
  const addKpi = () => setA({ ...a, kpis: [...(a.kpis || []), { name: '', target: '', achieved: '', score: 3 }] });
  const rmKpi = (i) => setA({ ...a, kpis: a.kpis.filter((_, idx) => idx !== i) });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <h2 style={{ marginBottom: 12 }}>{a._id ? 'Edit appraisal' : 'New appraisal'}</h2>
        <div className="form">
          <div className="form-grid">
            <label>Period<input value={a.period} onChange={set('period')} placeholder="2026-H1" /></label>
            <label>Overall rating
              <select value={a.rating} onChange={set('rating')}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select>
            </label>
          </div>
          <label>Status
            <select value={a.status} onChange={set('status')}>{['DRAFT', 'SUBMITTED', 'FINALIZED'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </label>
          <label>Manager feedback<textarea rows="3" value={a.managerFeedback || ''} onChange={set('managerFeedback')} /></label>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>KPIs</label>
              <button type="button" className="btn ghost" onClick={addKpi}>+ Add KPI</button>
            </div>
            {(a.kpis || []).map((k, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input className="input" style={{ flex: 2 }} placeholder="KPI" value={k.name} onChange={(e) => setKpi(i, 'name', e.target.value)} />
                <input className="input" style={{ flex: 1 }} placeholder="Target" value={k.target} onChange={(e) => setKpi(i, 'target', e.target.value)} />
                <input className="input" style={{ flex: 1 }} placeholder="Achieved" value={k.achieved} onChange={(e) => setKpi(i, 'achieved', e.target.value)} />
                <select className="input" style={{ width: 64 }} value={k.score} onChange={(e) => setKpi(i, 'score', Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                <button type="button" className="btn ghost" onClick={() => rmKpi(i)}>🗑</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!a.period.trim()} onClick={() => onSave(a)}>Save appraisal</button>
        </div>
      </div>
    </div>
  );
}
