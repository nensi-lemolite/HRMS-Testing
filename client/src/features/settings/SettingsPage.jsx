import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { usePerms } from "../../hooks/usePerms";

// ============== shared atoms ==============
function SectionHeader({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {subtitle && (
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ============== page ==============
export default function SettingsPage() {
  const { can } = usePerms();
  const canEdit = can("settings.write");

  // Departments & designations management is an admin activity; everyone may
  // still read company policies, so restricted users only see that section.
  const SECTIONS = useMemo(() => {
    const base = [];
    if (canEdit) {
      base.push({ key: "departments", icon: "🏢", label: "Departments" });
      base.push({ key: "designations", icon: "💼", label: "Designations" });
    }
    base.push({ key: "policies", icon: "📄", label: "Company Policies" });
    return base;
  }, [canEdit]);

  const [active, setActive] = useState(SECTIONS[0]?.key || "policies");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Organization structure and company policies.</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 240px) 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Vertical nav */}
        <nav
          style={{
            position: "sticky",
            top: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {SECTIONS.map((s) => {
            const on = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  border: "none",
                  borderRadius: 9,
                  cursor: "pointer",
                  textAlign: "left",
                  background: on ? "var(--primary-50)" : "transparent",
                  color: on ? "var(--primary-600)" : "var(--text)",
                  fontSize: 14,
                  fontWeight: on ? 600 : 500,
                  transition: "background 120ms ease",
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>
                  {s.icon}
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            minHeight: 480,
          }}
        >
          {active === "departments" && (
            <OrgUnitSection
              kind="departments"
              title="Departments"
              subtitle="Used to populate the Department dropdown on the employee form."
              noun="department"
              canEdit={canEdit}
            />
          )}
          {active === "designations" && (
            <OrgUnitSection
              kind="designations"
              title="Designations"
              subtitle="Used to populate the Designation dropdown on the employee form."
              noun="designation"
              canEdit={canEdit}
            />
          )}
          {active === "policies" && <PoliciesSection canEdit={canEdit} />}
        </div>
      </div>
    </div>
  );
}

// ============== Departments / Designations ==============
function OrgUnitSection({ kind, title, subtitle, noun, canEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/settings/${kind}`);
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const add = async (e) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(`/settings/${kind}`, { name });
      setItems((xs) =>
        [...xs, data.item].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDraft("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id) => {
    const name = editValue.trim();
    if (!name) return;
    setError("");
    try {
      const { data } = await api.patch(`/settings/${kind}/${id}`, { name });
      setItems((xs) =>
        xs
          .map((x) => (x._id === id ? data.item : x))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    }
  };

  const remove = async (id) => {
    if (!window.confirm(`Remove this ${noun}?`)) return;
    setError("");
    try {
      await api.delete(`/settings/${kind}/${id}`);
      setItems((xs) => xs.filter((x) => x._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove");
    }
  };

  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} />

      {canEdit && (
        <form
          onSubmit={add}
          style={{ display: "flex", gap: 8, margin: "12px 0 18px" }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Add a ${noun}…`}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 14,
              background: "var(--surface)",
              color: "var(--text)",
            }}
          />
          <button
            className="btn primary"
            type="submit"
            disabled={busy || !draft.trim()}
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {error && (
        <div className="error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No {noun}s yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((it) => (
            <div
              key={it._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              {editingId === it._id ? (
                <>
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 14,
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => saveEdit(it._id)}
                  >
                    Save
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14 }}>{it.name}</span>
                  {canEdit && (
                    <>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setEditingId(it._id);
                          setEditValue(it.name);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => remove(it._id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============== Company Policies ==============
const EMPTY_POLICY = { title: "", body: "" };

function PoliciesSection({ canEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_POLICY);
  const [editingId, setEditingId] = useState(null); // null = none, 'new' = creating
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/settings/policies");
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setForm(EMPTY_POLICY);
    setEditingId("new");
  };
  const startEdit = (p) => {
    setForm({ title: p.title, body: p.body || "" });
    setEditingId(p._id);
  };
  const cancel = () => {
    setEditingId(null);
    setForm(EMPTY_POLICY);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (editingId === "new") {
        const { data } = await api.post("/settings/policies", form);
        setItems((xs) =>
          [...xs, data.item].sort((a, b) => a.title.localeCompare(b.title)),
        );
      } else {
        const { data } = await api.patch(
          `/settings/policies/${editingId}`,
          form,
        );
        setItems((xs) =>
          xs
            .map((x) => (x._id === editingId ? data.item : x))
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      }
      cancel();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this policy?")) return;
    setError("");
    try {
      await api.delete(`/settings/policies/${id}`);
      setItems((xs) => xs.filter((x) => x._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove");
    }
  };

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 14,
    background: "var(--surface)",
    color: "var(--text)",
    width: "100%",
  };

  return (
    <>
      <SectionHeader
        title="Company Policies"
        subtitle="Policies visible to everyone in your company."
        action={
          canEdit && editingId === null ? (
            <button className="btn primary" type="button" onClick={startNew}>
              + Add policy
            </button>
          ) : null
        }
      />

      {error && (
        <div className="error" style={{ margin: "12px 0" }}>
          {error}
        </div>
      )}

      {editingId !== null && (
        <form
          onSubmit={save}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: 16,
            border: "1px solid var(--border)",
            borderRadius: 12,
            margin: "12px 0 20px",
          }}
        >
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Policy title"
            style={inputStyle}
            autoFocus
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Policy details…"
            rows={6}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn primary"
              type="submit"
              disabled={busy || !form.title.trim()}
            >
              {busy ? "Saving…" : "Save policy"}
            </button>
            <button className="btn" type="button" onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No policies yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((p) => (
            <div
              key={p._id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</div>
                  {p.body && (
                    <p
                      className="muted small"
                      style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}
                    >
                      {p.body}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn danger"
                      type="button"
                      onClick={() => remove(p._id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
