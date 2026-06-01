import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePerms } from "../../hooks/usePerms";

const STATUSES = ["NEW", "IN_REVIEW", "HIRED", "JOINED", "REJECTED"];
const LEVELS = ["JUNIOR", "MID", "SENIOR", "LEAD"];
const SOURCES = ["LINKEDIN", "EMAIL", "PHONE", "INPERSON", "OTHER"];
const REWARD_STATUSES = ["PENDING", "APPROVED", "PAID"];

const STATUS_META = {
  NEW: { label: "New", bg: "#eef2ff", fg: "#4338ca" },
  IN_REVIEW: { label: "In review", bg: "#fef3c7", fg: "#b45309" },
  HIRED: { label: "Hired", bg: "#dcfce7", fg: "#15803d" },
  JOINED: { label: "Joined", bg: "#d1fae5", fg: "#047857" },
  REJECTED: { label: "Rejected", bg: "#fee2e2", fg: "#b91c1c" },
};

const REWARD_META = {
  PENDING: { label: "Pending", bg: "#f1f5f9", fg: "#475569" },
  APPROVED: { label: "Approved", bg: "#eef2ff", fg: "#4338ca" },
  PAID: { label: "Paid", bg: "#dcfce7", fg: "#15803d" },
};

function fmtMoney(n, currency = "INR") {
  if (!n) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${new Intl.NumberFormat().format(n)}`;
  }
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function Pill({ meta, children }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: meta.bg,
        color: meta.fg,
        whiteSpace: "nowrap",
      }}
    >
      {children ?? meta.label}
    </span>
  );
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const { can } = usePerms();
  // SUPER_ADMIN is the policy owner / pipeline manager, not a referrer.
  // They get the admin views (All referrals, Policy) without the personal
  // "Refer someone" CTA or "My referrals" tab.
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const seeAll = can("referrals.read.all");
  const canRefer = can("referrals.refer") && !isSuperAdmin;
  const canWriteStatus = can("referrals.write");
  const canEditPolicy = can("referrals.policy.write");

  const initialTab = seeAll ? "all" : "mine";
  const [tab, setTab] = useState(initialTab);
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [stats, setStats] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referFormOpen, setReferFormOpen] = useState(false);
  const [pipelineFor, setPipelineFor] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const reqs = [
        api
          .get("/referrals", { params: { mine: 1 } })
          .then(({ data }) => setMine(data.referrals || [])),
        api.get("/referrals/policy").then(({ data }) => setPolicy(data.policy)),
      ];
      if (seeAll) {
        reqs.push(
          api.get("/referrals").then(({ data }) => setAll(data.referrals || []))
        );
        reqs.push(api.get("/referrals/stats").then(({ data }) => setStats(data)).catch(() => {}));
      }
      await Promise.all(reqs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const myList = mine;
  const adminList = seeAll ? all : [];

  const tabsForRole = [
    ...(isSuperAdmin ? [] : [{ key: "mine", label: "My referrals" }]),
    ...(seeAll ? [{ key: "all", label: "All referrals" }] : []),
    { key: "policy", label: "Policy" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Referrals</h1>
          <p className="muted">
            Refer great people to {policy?.payoutCondition ? "earn a bonus once they join and complete their probation." : "your company."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canRefer && (
            <button className="btn primary" onClick={() => setReferFormOpen(true)}>
              + Refer someone
            </button>
          )}
        </div>
      </div>

      {seeAll && stats && (
        <div
          className="kpi-row"
          style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
        >
          <div className="kpi-card gradient">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-foot">All referrals</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">In pipeline</div>
            <div className="kpi-value">
              {(stats.byStatus?.NEW || 0) + (stats.byStatus?.IN_REVIEW || 0)}
            </div>
            <div className="kpi-foot">New + In review</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Joined</div>
            <div className="kpi-value" style={{ color: "var(--success)" }}>
              {stats.byStatus?.JOINED || 0}
            </div>
            <div className="kpi-foot">Successful hires</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Bonus pending</div>
            <div className="kpi-value">{fmtMoney(stats.bonusPending, policy?.currency)}</div>
            <div className="kpi-foot">{fmtMoney(stats.bonusPaid, policy?.currency)} paid</div>
          </div>
        </div>
      )}

      <div className="tabs-row">
        {tabsForRole.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? "primary" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : tab === "mine" ? (
        <ReferralList
          referrals={myList}
          showReferrer={false}
          canManage={false}
          onOpenPipeline={setPipelineFor}
          policy={policy}
        />
      ) : tab === "all" && seeAll ? (
        <ReferralList
          referrals={adminList}
          showReferrer
          canManage={canWriteStatus}
          onOpenPipeline={setPipelineFor}
          policy={policy}
        />
      ) : tab === "policy" ? (
        <PolicyPanel
          policy={policy}
          canEdit={canEditPolicy}
          editing={editingPolicy}
          onEdit={() => setEditingPolicy(true)}
          onCancel={() => setEditingPolicy(false)}
          onSaved={(p) => {
            setPolicy(p);
            setEditingPolicy(false);
          }}
        />
      ) : null}

      {referFormOpen && (
        <ReferFormModal
          onClose={() => setReferFormOpen(false)}
          onCreated={(r) => {
            setMine([r, ...mine]);
            if (seeAll) setAll([r, ...all]);
            setReferFormOpen(false);
          }}
          policy={policy}
        />
      )}

      {pipelineFor && (
        <PipelineModal
          referral={pipelineFor}
          canManage={canWriteStatus}
          policy={policy}
          onClose={() => setPipelineFor(null)}
          onUpdated={(r) => {
            setMine((list) => list.map((x) => (x._id === r._id ? r : x)));
            setAll((list) => list.map((x) => (x._id === r._id ? r : x)));
            setPipelineFor(r);
          }}
          onDeleted={(id) => {
            setMine((list) => list.filter((x) => x._id !== id));
            setAll((list) => list.filter((x) => x._id !== id));
            setPipelineFor(null);
          }}
        />
      )}
    </div>
  );
}

function ReferralList({ referrals, showReferrer, canManage, onOpenPipeline, policy }) {
  const [filter, setFilter] = useState("ALL");
  const filtered = referrals.filter((r) => filter === "ALL" || r.status === filter);

  if (!referrals.length) {
    return (
      <div className="empty" style={{ padding: 28 }}>
        No referrals yet. Click <b>Refer someone</b> to add the first one.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          className={`btn ${filter === "ALL" ? "primary" : ""}`}
          onClick={() => setFilter("ALL")}
        >
          All · {referrals.length}
        </button>
        {STATUSES.map((s) => {
          const c = referrals.filter((r) => r.status === s).length;
          if (!c) return null;
          return (
            <button
              key={s}
              className={`btn ${filter === s ? "primary" : ""}`}
              onClick={() => setFilter(s)}
            >
              {STATUS_META[s].label} · {c}
            </button>
          );
        })}
      </div>

      <div className="card table-card">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Position</th>
              {showReferrer && <th>Referrer</th>}
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Bonus</th>
              <th>Reward</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id}>
                <td>
                  <div className="cell-name">{r.candidateName}</div>
                  <div className="cell-sub">
                    {r.candidateEmail || r.candidatePhone || "—"}
                  </div>
                </td>
                <td>
                  <div>{r.position || "—"}</div>
                  <div className="cell-sub">{r.level || "—"}</div>
                </td>
                {showReferrer && (
                  <td>
                    <div className="cell-name">{r.referrer?.name || "—"}</div>
                    <div className="cell-sub">{r.referrer?.empCode || ""}</div>
                  </td>
                )}
                <td>
                  <Pill meta={STATUS_META[r.status] || STATUS_META.NEW} />
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {r.bonusAmount
                    ? fmtMoney(r.bonusAmount, r.bonusCurrency || policy?.currency)
                    : "—"}
                </td>
                <td>
                  <Pill meta={REWARD_META[r.rewardStatus] || REWARD_META.PENDING} />
                </td>
                <td>{fmtDate(r.createdAt)}</td>
                <td>
                  <button className="btn ghost" onClick={() => onOpenPipeline(r)}>
                    {canManage ? "Manage" : "View"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={showReferrer ? 8 : 7} className="empty">
                  No referrals in this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReferFormModal({ onClose, onCreated, policy }) {
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    position: "",
    level: "MID",
    source: "LINKEDIN",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.candidateName.trim()) {
      setError("Candidate name is required");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/referrals", form);
      onCreated(data.referral);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const estBonus = policy?.bonusTiers?.find((t) => t.level === form.level)?.amount;

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form
        className="modal"
        style={{ width: "min(560px, calc(100vw - 32px))" }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal-icon info">🤝</div>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Refer a candidate</h2>
        <p className="muted small" style={{ margin: "0 0 14px" }}>
          We'll notify HR. You'll see updates as they move through the pipeline.
        </p>
        {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="form">
          <div className="form-grid">
            <label>
              Candidate name *
              <input
                value={form.candidateName}
                onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label>
              Position
              <input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="e.g. Senior Backend Engineer"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.candidateEmail}
                onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                value={form.candidatePhone}
                onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
              />
            </label>
            <label>
              Level
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              How do you know them?
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Why are they a great fit?"
            />
          </label>
        </div>

        {estBonus ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--primary-50)",
              color: "var(--primary-600)",
              fontSize: 13,
            }}
          >
            Estimated bonus if hired & joined:{" "}
            <b>{fmtMoney(estBonus, policy?.currency)}</b> (per current policy).
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit referral"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PipelineModal({ referral, canManage, policy, onClose, onUpdated, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(referral.status);
  const [bonusAmount, setBonusAmount] = useState(referral.bonusAmount || "");
  const [rewardStatus, setRewardStatus] = useState(referral.rewardStatus || "PENDING");
  const [rejectionReason, setRejectionReason] = useState(referral.rejectionReason || "");
  const [joinDate, setJoinDate] = useState(
    referral.joinDate ? referral.joinDate.slice(0, 10) : ""
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(referral.status);
    setBonusAmount(referral.bonusAmount || "");
    setRewardStatus(referral.rewardStatus || "PENDING");
    setRejectionReason(referral.rejectionReason || "");
    setJoinDate(referral.joinDate ? referral.joinDate.slice(0, 10) : "");
  }, [referral._id]);

  const tier = policy?.bonusTiers?.find((t) => t.level === referral.level);
  const suggestedBonus = tier?.amount || 0;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        status,
        bonusAmount: bonusAmount === "" ? 0 : Number(bonusAmount),
        rewardStatus,
        rejectionReason,
        joinDate: joinDate || null,
        statusNote: note || undefined,
      };
      const { data } = await api.patch(`/referrals/${referral._id}`, payload);
      onUpdated(data.referral);
      setNote("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirm("Delete this referral?")) return;
    setBusy(true);
    try {
      await api.delete(`/referrals/${referral._id}`);
      onDeleted(referral._id);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div
        className="modal"
        style={{ width: "min(640px, calc(100vw - 32px))", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-icon info">🛤</div>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>{referral.candidateName}</h2>
        <p className="muted small" style={{ margin: "0 0 14px" }}>
          {referral.position || "—"} · {referral.level} · Referred by{" "}
          <b>{referral.referrer?.name || "—"}</b>
        </p>
        {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Pipeline progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 18 }}>
          {["NEW", "IN_REVIEW", "HIRED", "JOINED"].map((s, i, arr) => {
            const order = ["NEW", "IN_REVIEW", "HIRED", "JOINED"];
            const currentIdx = order.indexOf(referral.status);
            const done = referral.status !== "REJECTED" && currentIdx >= i;
            return (
              <div key={s} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: done ? "var(--primary)" : "var(--surface-2)",
                  }}
                />
                {i < arr.length - 1 && <div style={{ width: 4 }} />}
              </div>
            );
          })}
        </div>

        <div className="form-grid" style={{ marginBottom: 12 }}>
          <div>
            <div className="muted small">Email</div>
            <div>{referral.candidateEmail || "—"}</div>
          </div>
          <div>
            <div className="muted small">Phone</div>
            <div>{referral.candidatePhone || "—"}</div>
          </div>
          <div>
            <div className="muted small">Source</div>
            <div>{referral.source || "—"}</div>
          </div>
          <div>
            <div className="muted small">Submitted</div>
            <div>{fmtDate(referral.createdAt)}</div>
          </div>
        </div>
        {referral.notes && (
          <div
            style={{
              borderLeft: "3px solid var(--primary)",
              paddingLeft: 12,
              marginBottom: 14,
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            {referral.notes}
          </div>
        )}

        {canManage ? (
          <div className="form">
            <div className="form-grid">
              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bonus amount ({policy?.currency || "INR"})
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder={suggestedBonus ? `Suggested ${suggestedBonus}` : ""}
                />
              </label>
              <label>
                Reward status
                <select value={rewardStatus} onChange={(e) => setRewardStatus(e.target.value)}>
                  {REWARD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {REWARD_META[s].label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Join date
                <input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                />
              </label>
            </div>
            {status === "REJECTED" && (
              <label>
                Reason for rejection
                <input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </label>
            )}
            <label>
              Note on this update (optional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Scheduled first round for 12-Mar"
              />
            </label>
          </div>
        ) : (
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div>
              <div className="muted small">Status</div>
              <Pill meta={STATUS_META[referral.status] || STATUS_META.NEW} />
            </div>
            <div>
              <div className="muted small">Bonus</div>
              <div>
                {referral.bonusAmount
                  ? fmtMoney(referral.bonusAmount, referral.bonusCurrency || policy?.currency)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="muted small">Reward</div>
              <Pill meta={REWARD_META[referral.rewardStatus] || REWARD_META.PENDING} />
            </div>
            <div>
              <div className="muted small">Join date</div>
              <div>{fmtDate(referral.joinDate)}</div>
            </div>
          </div>
        )}

        {referral.statusHistory?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted small" style={{ marginBottom: 6, fontWeight: 600 }}>
              Pipeline history
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {[...referral.statusHistory].reverse().map((h, i) => (
                <li key={i}>
                  <b>{STATUS_META[h.status]?.label || h.status}</b> · {fmtDate(h.at)}
                  {h.note ? ` — ${h.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}
        >
          {canManage && (
            <button className="btn danger" onClick={doDelete} disabled={busy}>
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose} disabled={busy}>
            Close
          </button>
          {canManage && (
            <button className="btn primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyPanel({ policy, canEdit, editing, onEdit, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    text: policy?.text || "",
    eligibility: policy?.eligibility || "",
    payoutCondition: policy?.payoutCondition || "",
    currency: policy?.currency || "INR",
    bonusTiers: policy?.bonusTiers?.length
      ? policy.bonusTiers.map((t) => ({ ...t }))
      : LEVELS.map((l) => ({ level: l, amount: 0 })),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      text: policy?.text || "",
      eligibility: policy?.eligibility || "",
      payoutCondition: policy?.payoutCondition || "",
      currency: policy?.currency || "INR",
      bonusTiers: policy?.bonusTiers?.length
        ? policy.bonusTiers.map((t) => ({ ...t }))
        : LEVELS.map((l) => ({ level: l, amount: 0 })),
    });
  }, [policy?._id, editing]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put("/referrals/policy", form);
      onSaved(data.policy);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!policy) return <div className="empty">Loading…</div>;

  if (!editing) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>Referral policy</h2>
          {canEdit && (
            <button className="btn" onClick={onEdit}>
              Edit policy
            </button>
          )}
        </div>

        <section style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>How it works</h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>
            {policy.text || <span className="muted">No policy text set yet.</span>}
          </p>
        </section>

        <section style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Bonus tiers</h3>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Position level</th>
                <th style={{ textAlign: "right" }}>Bonus</th>
              </tr>
            </thead>
            <tbody>
              {(policy.bonusTiers || []).map((t) => (
                <tr key={t.level}>
                  <td>{t.level}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmtMoney(t.amount, policy.currency)}
                  </td>
                </tr>
              ))}
              {(policy.bonusTiers || []).length === 0 && (
                <tr>
                  <td colSpan="2" className="empty">
                    No bonus tiers configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Eligibility</h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>
            {policy.eligibility || <span className="muted">—</span>}
          </p>
        </section>

        <section>
          <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Payout</h3>
          <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.55 }}>
            {policy.payoutCondition || <span className="muted">—</span>}
          </p>
        </section>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ margin: "0 0 6px" }}>Edit referral policy</h2>
      <p className="muted small" style={{ margin: "0 0 14px" }}>
        Changes are visible to everyone immediately.
      </p>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="form">
        <label>
          How it works
          <textarea
            rows={4}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </label>
        <label>
          Eligibility
          <textarea
            rows={3}
            value={form.eligibility}
            onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
          />
        </label>
        <label>
          Payout condition
          <textarea
            rows={2}
            value={form.payoutCondition}
            onChange={(e) => setForm({ ...form, payoutCondition: e.target.value })}
          />
        </label>
        <label style={{ maxWidth: 200 }}>
          Currency
          <input
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
          />
        </label>

        <h3 style={{ fontSize: 14, marginTop: 14 }}>Bonus tiers</h3>
        <table className="modern-table">
          <thead>
            <tr>
              <th>Level</th>
              <th style={{ width: 200 }}>Amount</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {form.bonusTiers.map((t, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={t.level}
                    onChange={(e) => {
                      const next = [...form.bonusTiers];
                      next[i] = { ...next[i], level: e.target.value.toUpperCase() };
                      setForm({ ...form, bonusTiers: next });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={t.amount}
                    onChange={(e) => {
                      const next = [...form.bonusTiers];
                      next[i] = { ...next[i], amount: Number(e.target.value) || 0 };
                      setForm({ ...form, bonusTiers: next });
                    }}
                  />
                </td>
                <td>
                  <button
                    className="row-icon-btn danger"
                    onClick={() =>
                      setForm({
                        ...form,
                        bonusTiers: form.bonusTiers.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="btn"
          onClick={() =>
            setForm({
              ...form,
              bonusTiers: [...form.bonusTiers, { level: "", amount: 0 }],
            })
          }
        >
          + Add tier
        </button>
      </div>

      <div
        style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}
      >
        <button className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save policy"}
        </button>
      </div>
    </div>
  );
}
