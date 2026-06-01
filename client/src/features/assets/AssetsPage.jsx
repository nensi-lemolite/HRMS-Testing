import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { usePerms } from "../../hooks/usePerms";

const ASSET_KINDS = [
  "LAPTOP",
  "MONITOR",
  "KEYBOARD",
  "MOUSE",
  "HEADSET",
  "ACCESS_CARD",
  "SOFTWARE_LICENSE",
  "PHONE",
  "OTHER",
];

const KIND_META = {
  LAPTOP: { icon: "💻", tint: "#eef2ff", fg: "#4338ca" },
  MONITOR: { icon: "🖥", tint: "#ecfeff", fg: "#0e7490" },
  KEYBOARD: { icon: "⌨", tint: "#f0fdf4", fg: "#15803d" },
  MOUSE: { icon: "🖱", tint: "#fef3c7", fg: "#b45309" },
  HEADSET: { icon: "🎧", tint: "#fdf2f8", fg: "#be185d" },
  ACCESS_CARD: { icon: "🪪", tint: "#f5f3ff", fg: "#6d28d9" },
  SOFTWARE_LICENSE: { icon: "🔑", tint: "#fff7ed", fg: "#c2410c" },
  PHONE: { icon: "📱", tint: "#f1f5f9", fg: "#334155" },
  OTHER: { icon: "📦", tint: "#f8fafc", fg: "#475569" },
};

const STATUS_META = {
  AVAILABLE: {
    label: "In storage",
    dot: "#4338ca",
    bg: "#eef2ff",
    fg: "#4338ca",
  },
  ASSIGNED: { label: "Assigned", dot: "#16a34a", bg: "#dcfce7", fg: "#15803d" },
  RETURNED: { label: "Returned", dot: "#64748b", bg: "#f1f5f9", fg: "#475569" },
  LOST: { label: "Lost", dot: "#dc2626", bg: "#fee2e2", fg: "#b91c1c" },
  DAMAGED: { label: "Damaged", dot: "#d97706", bg: "#fef3c7", fg: "#b45309" },
};

const STATUS_TABS = [
  { key: "ALL", label: "All", match: () => true },
  {
    key: "AVAILABLE",
    label: "In storage",
    match: (a) => a.status === "AVAILABLE",
  },
  { key: "ASSIGNED", label: "Assigned", match: (a) => a.status === "ASSIGNED" },
  { key: "RETURNED", label: "Returned", match: (a) => a.status === "RETURNED" },
  {
    key: "AT_RISK",
    label: "Lost / Damaged",
    match: (a) => a.status === "LOST" || a.status === "DAMAGED",
  },
];

const SORTS = {
  newest: {
    label: "Newest first",
    cmp: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  },
  oldest: {
    label: "Oldest first",
    cmp: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  },
  kind: { label: "Kind A→Z", cmp: (a, b) => a.kind.localeCompare(b.kind) },
  label: {
    label: "Label A→Z",
    cmp: (a, b) => (a.label || "").localeCompare(b.label || ""),
  },
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}
function initials(name) {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.RETURNED;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px 3px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: m.bg,
        color: m.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot }}
      />
      {m.label}
    </span>
  );
}

function KindIcon({ kind, size = 40 }) {
  const m = KIND_META[kind] || KIND_META.OTHER;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: m.tint,
        color: m.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {m.icon}
    </div>
  );
}

function ActionMenu({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Actions"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        ⋮
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            zIndex: 20,
            minWidth: 180,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            padding: 4,
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        border: "none",
        background: "transparent",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 14,
        color: danger ? "var(--danger)" : "var(--text)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

// ============== Modal ==============
function Modal({ title, subtitle, icon, onClose, children, width = 640 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 16px",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          animation: "modal-pop .15s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {icon}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
            {subtitle && (
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              color: "var(--text-muted)",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ============== Form primitives ==============
function FormSection({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: "var(--text-muted)",
          }}
        >
          {title}
        </div>
        {hint && (
          <div
            style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{hint}</span>
      )}
    </label>
  );
}

function FormActions({ onCancel, primaryLabel, busy }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 8,
        paddingTop: 16,
        borderTop: "1px solid var(--border)",
      }}
    >
      <button type="button" className="btn" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "Saving…" : primaryLabel}
      </button>
    </div>
  );
}

// ============== Skeleton ==============
function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 14,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--surface-2)",
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 14,
            width: "50%",
            background: "var(--surface-2)",
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <div
          style={{
            height: 11,
            width: "30%",
            background: "var(--surface-2)",
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

// =====================================================================
export default function AssetsPage() {
  const { can } = usePerms();
  // Asset-admin: HR / Admin / Manager who can see or manage everyone's assets.
  // Plain employees get a stripped-down "My assets" view without status tabs,
  // search, sort, export or view-mode toggle — overkill for a personal list.
  const canAdmin = can("assets.read.all") || can("assets.write");
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeFilter = searchParams.get("employeeId") || "";

  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("ALL");
  const [kindFilter, setKindFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [viewMode, setViewMode] = useState("cards");

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null); // pre-selected asset when opening from row

  const reload = async () => {
    setLoading(true);
    try {
      const params = employeeFilter ? { employeeId: employeeFilter } : {};
      const [a, e] = await Promise.all([
        api.get("/assets", { params }),
        api.get("/employees"),
      ]);
      setAssets(a.data.assets || []);
      setEmployees(e.data.employees || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, [employeeFilter]);

  const empMap = useMemo(() => {
    const m = new Map();
    employees.forEach((e) => m.set(String(e._id), e));
    return m;
  }, [employees]);

  const counts = useMemo(() => {
    const c = { ALL: assets.length };
    STATUS_TABS.slice(1).forEach((t) => {
      c[t.key] = assets.filter(t.match).length;
    });
    return c;
  }, [assets]);

  const filtered = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.key === statusTab) || STATUS_TABS[0];
    return assets
      .filter((a) => {
        if (!tab.match(a)) return false;
        if (kindFilter && a.kind !== kindFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const emp = empMap.get(String(a.employee));
          const hit = [a.label, a.tag, a.serial, emp?.name, emp?.empCode]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      })
      .sort(SORTS[sortKey].cmp);
  }, [assets, statusTab, kindFilter, search, empMap, sortKey]);

  const patchAsset = async (a, patch) => {
    try {
      await api.patch(`/assets/${a._id}`, patch);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update");
    }
  };

  const deleteAsset = async (a) => {
    if (!confirm(`Delete asset record for "${a.label || a.kind}"?`)) return;
    try {
      await api.delete(`/assets/${a._id}`);
      await reload();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  const openAssignFor = (asset) => {
    setAssignTarget(asset);
    setAssignOpen(true);
  };

  const exportCsv = () => {
    const head = [
      "Employee",
      "EmpCode",
      "Kind",
      "Label",
      "Tag",
      "Serial",
      "Status",
      "AssignedAt",
      "ReturnedAt",
    ];
    const rows = filtered.map((a) => {
      const emp = empMap.get(String(a.employee));
      return [
        emp?.name || "",
        emp?.empCode || "",
        a.kind,
        a.label || "",
        a.tag || "",
        a.serial || "",
        a.status,
        a.assignedAt || "",
        a.returnedAt || "",
      ];
    });
    const csv = [head, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const clearEmployeeFilter = () => {
    searchParams.delete("employeeId");
    setSearchParams(searchParams, { replace: true });
  };
  const filteredEmployee = empMap.get(String(employeeFilter));

  const renderActions = (a) => (
    <ActionMenu>
      {(close) => (
        <>
          {can("assets.write") && a.status !== "ASSIGNED" && (
            <MenuItem
              onClick={() => {
                close();
                openAssignFor(a);
              }}
            >
              👤 Assign to employee…
            </MenuItem>
          )}
          {can("assets.write") && a.status === "ASSIGNED" && (
            <>
              <MenuItem
                onClick={() => {
                  close();
                  patchAsset(a, { status: "RETURNED" });
                }}
              >
                ↩ Mark returned
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  patchAsset(a, { status: "LOST" });
                }}
              >
                🚨 Mark lost
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  patchAsset(a, { status: "DAMAGED" });
                }}
              >
                ⚠ Mark damaged
              </MenuItem>
            </>
          )}
          {can("assets.write") && a.status === "RETURNED" && (
            <MenuItem
              onClick={() => {
                close();
                patchAsset(a, { status: "AVAILABLE" });
              }}
            >
              📦 Return to inventory
            </MenuItem>
          )}
          {can("assets.write") && (
            <MenuItem
              danger
              onClick={() => {
                close();
                deleteAsset(a);
              }}
            >
              🗑 Delete
            </MenuItem>
          )}
        </>
      )}
    </ActionMenu>
  );

  const renderCard = (a) => {
    const emp = a.employee ? empMap.get(String(a.employee)) : null;
    const km = KIND_META[a.kind] || KIND_META.OTHER;
    return (
      <div
        key={a._id}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 16,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          transition: "transform .15s ease, box-shadow .15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <KindIcon kind={a.kind} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.label || a.kind.replace(/_/g, " ")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: km.fg,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {a.kind.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          {renderActions(a)}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            fontSize: 13,
          }}
        >
          <div>
            <div
              className="muted"
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Tag
            </div>
            <div
              style={{ fontFamily: "ui-monospace, monospace", marginTop: 2 }}
            >
              {a.tag || "—"}
            </div>
          </div>
          <div>
            <div
              className="muted"
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Serial
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.serial || "—"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          {emp ? (
            <Link
              to={`/employees/${emp._id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                className="avatar small"
                style={{ width: 28, height: 28, fontSize: 11 }}
              >
                {initials(emp.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                  {emp.name}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {emp.empCode}
                </div>
              </div>
            </Link>
          ) : (
            <span
              className="muted"
              style={{
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📦 Inventory
            </span>
          )}
          <StatusPill status={a.status} />
        </div>

        <div className="muted" style={{ fontSize: 11 }}>
          {a.assignedAt
            ? `Assigned ${fmtDate(a.assignedAt)}`
            : `Added ${fmtDate(a.createdAt)}`}
          {a.returnedAt ? ` · Returned ${fmtDate(a.returnedAt)}` : ""}
        </div>
      </div>
    );
  };

  return (
    <div>
      <style>{`
        @keyframes modal-pop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .a-field {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .a-field::placeholder { color: var(--text-faint); }
        .a-field:hover:not(:focus) { border-color: #cbd5e1; }
        .a-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
          background: var(--surface);
        }
        select.a-field {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3e%3cpath d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 18px;
          padding-right: 36px;
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "var(--primary-50)",
              color: "var(--primary-600)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            💻
          </div>
          <div>
            <h1 style={{ margin: 0 }}>{canAdmin ? "Assets" : "My assets"}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {canAdmin
                ? "Manage your inventory and assignments — laptops, monitors, access cards and licenses."
                : "Devices and items assigned to you."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canAdmin && (
            <button
              className="btn"
              onClick={exportCsv}
              title="Export current view as CSV"
            >
              ⬇ Export
            </button>
          )}
          {can("assets.write") && (
            <>
              <button className="btn" onClick={() => setAddOpen(true)}>
                + Add asset
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setAssignTarget(null);
                  setAssignOpen(true);
                }}
              >
                👤 Assign asset
              </button>
            </>
          )}
        </div>
      </div>

      {employeeFilter && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--primary-50)",
            border: "1px solid var(--primary-100)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 14,
          }}
        >
          <div>
            <span style={{ color: "var(--primary-600)" }}>🔍 Filtered to:</span>{" "}
            <b>
              {filteredEmployee
                ? `${filteredEmployee.name} (${filteredEmployee.empCode})`
                : employeeFilter}
            </b>
          </div>
          <button className="btn" onClick={clearEmployeeFilter}>
            Show all
          </button>
        </div>
      )}

      {/* Segmented status tabs — admin only */}
      {canAdmin && (
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          marginBottom: 14,
          background: "var(--surface-2)",
          borderRadius: 10,
          border: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {STATUS_TABS.map((t) => {
          const on = statusTab === t.key;
          const danger = t.key === "AT_RISK";
          return (
            <button
              key={t.key}
              onClick={() => setStatusTab(t.key)}
              style={{
                padding: "7px 14px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: on ? "var(--surface)" : "transparent",
                color: on
                  ? danger
                    ? "var(--danger)"
                    : "var(--text)"
                  : "var(--text-muted)",
                boxShadow: on ? "var(--shadow-sm)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "all .15s ease",
              }}
            >
              {t.label}
              <span
                style={{
                  background: on
                    ? danger
                      ? "#fee2e2"
                      : "var(--primary-50)"
                    : "transparent",
                  color: on
                    ? danger
                      ? "#b91c1c"
                      : "var(--primary-600)"
                    : "var(--text-muted)",
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {counts[t.key] || 0}
              </span>
            </button>
          );
        })}
      </div>
      )}

      {/* Toolbar — admin only */}
      {canAdmin && (
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-faint)",
            }}
          >
            ⌕
          </span>
          <input
            className="input"
            placeholder="Search label, tag, serial or employee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34, width: "100%" }}
          />
        </div>
        <select
          className="input"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
        >
          <option value="">All kinds</option>
          {ASSET_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].icon} {k.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          title="Sort by"
        >
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              ↕ {v.label}
            </option>
          ))}
        </select>
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <button
            onClick={() => setViewMode("cards")}
            title="Cards view"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                viewMode === "cards" ? "var(--surface)" : "transparent",
              color: viewMode === "cards" ? "var(--text)" : "var(--text-muted)",
              boxShadow: viewMode === "cards" ? "var(--shadow-sm)" : "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ▦
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background:
                viewMode === "table" ? "var(--surface)" : "transparent",
              color: viewMode === "table" ? "var(--text)" : "var(--text-muted)",
              boxShadow: viewMode === "table" ? "var(--shadow-sm)" : "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ≡
          </button>
        </div>
      </div>
      )}

      {/* Content */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          {assets.length === 0 ? (
            canAdmin ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  No assets in the system yet
                </div>
                <div className="muted" style={{ marginBottom: 14 }}>
                  Add a laptop, monitor or license to your inventory, then assign
                  it to a teammate.
                </div>
                {can("assets.write") && (
                  <div
                    style={{ display: "flex", gap: 10, justifyContent: "center" }}
                  >
                    <button
                      className="btn primary"
                      onClick={() => setAddOpen(true)}
                    >
                      Add your first asset
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                  No assets assigned to you yet
                </div>
                <div className="muted">
                  When IT assigns a laptop, monitor or other item, it'll show up here.
                </div>
              </>
            )
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                No matches
              </div>
              <div className="muted">
                Try a different search or clear filters.
              </div>
            </>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map(renderCard)}
        </div>
      ) : (
        <div className="card table-card" style={{ padding: 0 }}>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Employee</th>
                <th>Tag</th>
                <th>Serial</th>
                <th>Status</th>
                <th>Assigned</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const emp = a.employee ? empMap.get(String(a.employee)) : null;
                return (
                  <tr key={a._id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <KindIcon kind={a.kind} size={36} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {a.label || a.kind.replace(/_/g, " ")}
                          </div>
                          <div className="cell-sub">
                            {a.kind.replace(/_/g, " ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {emp ? (
                        <Link
                          to={`/employees/${emp._id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div
                            className="avatar small"
                            style={{ width: 26, height: 26, fontSize: 11 }}
                          >
                            {initials(emp.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {emp.name}
                            </div>
                            <div className="cell-sub">{emp.empCode}</div>
                          </div>
                        </Link>
                      ) : (
                        <span className="muted">📦 Inventory</span>
                      )}
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace" }}>
                      {a.tag || "—"}
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace" }}>
                      {a.serial || "—"}
                    </td>
                    <td>
                      <StatusPill status={a.status} />
                    </td>
                    <td>
                      {a.assignedAt ? (
                        fmtDate(a.assignedAt)
                      ) : (
                        <span className="muted">—</span>
                      )}
                      {a.returnedAt ? (
                        <div className="cell-sub">
                          Ret. {fmtDate(a.returnedAt)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ textAlign: "right" }}>{renderActions(a)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ Add Asset Modal ============ */}
      {addOpen && (
        <AddAssetModal
          onClose={() => setAddOpen(false)}
          onSaved={async () => {
            await reload();
            setAddOpen(false);
          }}
        />
      )}

      {/* ============ Assign Asset Modal ============ */}
      {assignOpen && (
        <AssignAssetModal
          onClose={() => {
            setAssignOpen(false);
            setAssignTarget(null);
          }}
          onSaved={async () => {
            await reload();
            setAssignOpen(false);
            setAssignTarget(null);
          }}
          presetAsset={assignTarget}
          employees={employees}
          empMap={empMap}
        />
      )}
    </div>
  );
}

// =====================================================================
// ============ ADD ASSET ============
// =====================================================================
function AddAssetModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    kind: "LAPTOP",
    label: "",
    tag: "",
    serial: "",
    condition: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const km = KIND_META[form.kind] || KIND_META.OTHER;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.label && !form.tag) {
      setError(
        "Provide at least a label or an asset tag so you can identify it later.",
      );
      return;
    }
    setBusy(true);
    try {
      await api.post("/assets", form);
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add asset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add asset to inventory"
      subtitle="Register a new asset. You can assign it to an employee afterwards."
      icon={<KindIcon kind={form.kind} size={40} />}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {error && (
          <div className="error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <FormSection title="Asset details">
          <div className="form-grid">
            <Field label="Kind" required>
              <select
                className="a-field"
                value={form.kind}
                onChange={set("kind")}
              >
                {ASSET_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_META[k].icon} {k.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Label">
              <input
                className="a-field"
                value={form.label}
                onChange={set("label")}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Identification">
          <div className="form-grid">
            <Field label="Asset tag">
              <input
                className="a-field"
                value={form.tag}
                onChange={set("tag")}
              />
            </Field>
            <Field label="Serial number">
              <input
                className="a-field"
                value={form.serial}
                onChange={set("serial")}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Condition & notes">
          <div className="form-grid">
            <Field label="Condition">
              <select
                className="a-field"
                value={form.condition}
                onChange={set("condition")}
              >
                <option value="">—</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Refurbished">Refurbished</option>
                <option value="Damaged">Damaged</option>
              </select>
            </Field>
            <Field label="Notes">
              <input
                className="a-field"
                value={form.notes}
                onChange={set("notes")}
              />
            </Field>
          </div>
        </FormSection>

        <FormActions
          onCancel={onClose}
          primaryLabel="Add to inventory"
          busy={busy}
        />
      </form>
    </Modal>
  );
}

// =====================================================================
// ============ ASSIGN ASSET ============
// =====================================================================
function AssignAssetModal({
  onClose,
  onSaved,
  presetAsset,
  employees,
  empMap,
}) {
  const [available, setAvailable] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(!presetAsset);
  const [form, setForm] = useState({
    assetId: presetAsset?._id || "",
    employee: "",
    assignedAt: new Date().toISOString().slice(0, 10),
    condition: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Only active employees can receive an asset
  const activeEmployees = useMemo(
    () => (employees || []).filter((e) => e.status === "ACTIVE"),
    [employees],
  );

  useEffect(() => {
    if (presetAsset) return;
    setLoadingAvail(true);
    api
      .get("/assets", { params: { unassigned: 1 } })
      .then(({ data }) => setAvailable(data.assets || []))
      .finally(() => setLoadingAvail(false));
  }, [presetAsset]);

  const chosenAsset =
    presetAsset || available.find((a) => a._id === form.assetId);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.assetId) {
      setError("Choose an asset to assign.");
      return;
    }
    if (!form.employee) {
      setError("Choose an employee.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/assets/${form.assetId}/assign`, {
        employee: form.employee,
        assignedAt: form.assignedAt,
        condition: form.condition || undefined,
        notes: form.notes || undefined,
      });
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Assign asset"
      subtitle="Hand an asset from inventory to an employee."
      icon={<KindIcon kind={chosenAsset?.kind || "OTHER"} size={40} />}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {error && (
          <div className="error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}

        <FormSection>
          {presetAsset ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <KindIcon kind={presetAsset.kind} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {presetAsset.label || presetAsset.kind.replace(/_/g, " ")}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {presetAsset.kind.replace(/_/g, " ")}
                  {presetAsset.tag ? ` · Tag ${presetAsset.tag}` : ""}
                  {presetAsset.serial ? ` · S/N ${presetAsset.serial}` : ""}
                </div>
              </div>
            </div>
          ) : loadingAvail ? (
            <SkeletonRow />
          ) : available.length === 0 ? (
            <div
              style={{
                padding: 18,
                textAlign: "center",
                background: "var(--surface-2)",
                border: "1px dashed var(--border)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 24 }}>📦</div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>
                No assets in storage
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                Add an asset first via "+ Add asset".
              </div>
            </div>
          ) : (
            <Field label="Asset" required>
              <select
                className="a-field"
                value={form.assetId}
                onChange={set("assetId")}
                required
              >
                <option value="">— Pick from inventory —</option>
                {available.map((a) => (
                  <option key={a._id} value={a._id}>
                    {KIND_META[a.kind]?.icon}{" "}
                    {a.label || a.kind.replace(/_/g, " ")}
                    {a.tag ? ` · ${a.tag}` : ""}
                    {a.serial ? ` · ${a.serial}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </FormSection>

        <FormSection title="">
          <Field label="Employee" required>
            <select
              className="a-field"
              value={form.employee}
              onChange={set("employee")}
              required
            >
              <option value="">— Select employee —</option>
              {activeEmployees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                  {emp.department ? ` (${emp.department})` : ""}
                </option>
              ))}
            </select>
            {activeEmployees.length === 0 && (
              <span
                style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}
              >
                No active employees available — add or activate an employee
                first.
              </span>
            )}
          </Field>
        </FormSection>

        <FormSection>
          <div className="form-grid">
            <Field label="Assigned on" required>
              <input
                className="a-field"
                type="date"
                value={form.assignedAt}
                onChange={set("assignedAt")}
                required
              />
            </Field>
            <Field label="Condition handed over">
              <select
                className="a-field"
                value={form.condition}
                onChange={set("condition")}
              >
                <option value="">—</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Refurbished">Refurbished</option>
                <option value="Damaged">Damaged</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notes">
              <input
                className="a-field"
                value={form.notes}
                onChange={set("notes")}
              />
            </Field>
          </div>
        </FormSection>

        <FormActions
          onCancel={onClose}
          primaryLabel="Assign asset"
          busy={busy}
        />
      </form>
    </Modal>
  );
}
