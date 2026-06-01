import { useEffect, useState, useRef } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { usePerms } from "../../hooks/usePerms";

const TABS = [
  "Profile",
  "Skills",
  "Shift",
  "Salary",
  "Leave",
  "Attendance",
  "Documents",
  "Assets",
  "Performance",
  "Exit",
  "Payslips",
];
const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function reviewPeriodOptions() {
  const y = new Date().getFullYear();
  const years = [y, y - 1];
  const out = [];
  years.forEach((yr) => {
    out.push({ value: `${yr}-H1`, label: `${yr} · H1 (Jan – Jun)` });
    out.push({ value: `${yr}-H2`, label: `${yr} · H2 (Jul – Dec)` });
    out.push({ value: `${yr}-Q1`, label: `${yr} · Q1 (Jan – Mar)` });
    out.push({ value: `${yr}-Q2`, label: `${yr} · Q2 (Apr – Jun)` });
    out.push({ value: `${yr}-Q3`, label: `${yr} · Q3 (Jul – Sep)` });
    out.push({ value: `${yr}-Q4`, label: `${yr} · Q4 (Oct – Dec)` });
    out.push({ value: `${yr}`, label: `${yr} · Annual` });
  });
  return out;
}
const STATUSES = ["ACTIVE", "ON_NOTICE", "RESIGNED", "TERMINATED", "EXITED"];
const DOCUMENT_KINDS = [
  "RESUME",
  "OFFER_LETTER",
  "APPOINTMENT_LETTER",
  "ID_PROOF",
  "PAN_CARD",
  "AADHAAR",
  "EDUCATION_CERTIFICATE",
  "EXPERIENCE_LETTER",
  "RELIEVING_LETTER",
  "OTHER",
];
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

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}
function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString() : "—";
}
function fmtTime(d) {
  return d
    ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
}
function fmtMoney(n) {
  return new Intl.NumberFormat().format(n || 0);
}
function TagChips({ items }) {
  if (!items || items.length === 0) return <span className="muted">—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((t) => (
        <span
          key={t}
          className="tag-pill"
          style={{
            background: "var(--primary-50)",
            color: "var(--primary-600)",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function TagInput({ value, onChange, placeholder, accent = "var(--primary)" }) {
  const [draft, setDraft] = useState("");
  const add = (raw) => {
    const v = (raw ?? draft).trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  const remove = (t) => onChange(value.filter((x) => x !== t));
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        minHeight: 42,
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget)
          e.currentTarget.querySelector("input")?.focus();
      }}
    >
      {value.map((t) => (
        <span
          key={t}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "var(--primary-50)",
            color: "var(--primary-600)",
            padding: "4px 4px 4px 10px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--primary-600)",
              fontSize: 16,
              lineHeight: 1,
              padding: "0 6px",
            }}
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add()}
        placeholder={value.length === 0 ? placeholder : ""}
        style={{
          flex: 1,
          minWidth: 120,
          border: "none",
          outline: "none",
          padding: "6px 4px",
          fontSize: 14,
          background: "transparent",
        }}
      />
    </div>
  );
}

function fmtBytes(n) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const DEFAULT_SALARY = {
  IN: [
    { code: "BASIC", label: "Basic", amount: 0 },
    { code: "HRA", label: "House Rent Allowance", amount: 0 },
    { code: "SPECIAL", label: "Special Allowance", amount: 0 },
  ],
  QA: [
    { code: "BASIC", label: "Basic", amount: 0 },
    { code: "HOUSING", label: "Housing Allowance", amount: 0 },
    { code: "TRANSPORT", label: "Transport Allowance", amount: 0 },
    { code: "OTHER", label: "Other Allowance", amount: 0 },
  ],
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { can } = usePerms();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employee, setEmployee] = useState(null);
  const [login, setLogin] = useState(null);
  const [counts, setCounts] = useState({});
  const [tab, setTab] = useState("Profile");
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [salaryEdit, setSalaryEdit] = useState(false);
  const [salaryRows, setSalaryRows] = useState([]);
  const [salarySaving, setSalarySaving] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState([]);

  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveApplyOpen, setLeaveApplyOpen] = useState(false);
  const [leaveApplyForm, setLeaveApplyForm] = useState({
    type: "",
    from: "",
    to: "",
    reason: "",
  });
  const [leaveApplyBusy, setLeaveApplyBusy] = useState(false);
  const [leaveApplyError, setLeaveApplyError] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [payslips, setPayslips] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [newDoc, setNewDoc] = useState({ kind: "RESUME", label: "" });
  const docFileRef = useRef(null);
  const [docBusy, setDocBusy] = useState(false);

  const [assets, setAssets] = useState([]);
  const [newAsset, setNewAsset] = useState({
    kind: "LAPTOP",
    tag: "",
    label: "",
    serial: "",
  });
  const [assetBusy, setAssetBusy] = useState(false);

  const [appraisals, setAppraisals] = useState([]);
  const [newAppraisal, setNewAppraisal] = useState({
    period: "",
    rating: 3,
    managerFeedback: "",
    kpis: [],
  });
  const [perfBusy, setPerfBusy] = useState(false);
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);

  // Increment flow
  const [showIncrementForm, setShowIncrementForm] = useState(false);
  const [incrementForm, setIncrementForm] = useState({
    newCtc: "",
    newBasic: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "INCREMENT",
  });
  const [incrementBusy, setIncrementBusy] = useState(false);
  const [incrementError, setIncrementError] = useState("");

  const [exitChecklist, setExitChecklist] = useState(null);
  const [exitForm, setExitForm] = useState({});
  const [exitBusy, setExitBusy] = useState(false);

  const photoRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Password reset
  const [resetPwOpen, setResetPwOpen] = useState(false);

  const canManage = ["SUPER_ADMIN", "HR_ADMIN"].includes(user?.role);

  const fillForm = (e) => ({
    empCode: e.empCode || "",
    name: e.name || "",
    email: e.email || "",
    phone: e.phone || "",
    dob: e.dob ? e.dob.slice(0, 10) : "",
    gender: e.gender || "",
    maritalStatus: e.maritalStatus || "",
    bloodGroup: e.bloodGroup || "",
    department: e.department || "",
    designation: e.designation || "",
    joinDate: e.joinDate ? e.joinDate.slice(0, 10) : "",
    probationEndDate: e.probationEndDate ? e.probationEndDate.slice(0, 10) : "",
    employmentType: e.employmentType || "FULL_TIME",
    workLocation: e.workLocation || "",
    officeBranch: e.officeBranch || "",
    team: e.team || "",
    grade: e.grade || "",
    status: e.status || "ACTIVE",
    emergencyContactName: e.emergencyContact?.name || "",
    emergencyContactPhone: e.emergencyContact?.phone || "",
    emergencyContactRelation: e.emergencyContact?.relation || "",
    addressCurrent: e.address?.current?.line1 || "",
    addressPermanent: e.address?.permanent?.line1 || "",
  });

  const fillITForm = (e) => ({
    skills: Array.isArray(e.skills) ? [...e.skills] : [],
    technologyStack: Array.isArray(e.technologyStack)
      ? [...e.technologyStack]
      : [],
    experienceYears: e.experienceYears ?? "",
  });

  const fillShiftForm = (e) => ({
    workMode: e.workMode || "WFO",
    shiftAssignment: e.shiftAssignment || "",
    workHours: e.workHours ?? "",
    weeklyOff: Array.isArray(e.weeklyOff) ? [...e.weeklyOff] : [],
  });

  const [itForm, setItForm] = useState({});
  const [shiftForm, setShiftForm] = useState({});
  const [itEditing, setItEditing] = useState(false);
  const [shiftEditing, setShiftEditing] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/employees/${id}`);
    setEmployee(data.employee);
    setLogin(data.login || null);
    setCounts(data.counts || {});
    setForm(fillForm(data.employee));
    setItForm(fillITForm(data.employee));
    setShiftForm(fillShiftForm(data.employee));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    Promise.all([
      api.get("/settings/departments").catch(() => ({ data: { items: [] } })),
      api.get("/settings/designations").catch(() => ({ data: { items: [] } })),
    ]).then(([dep, des]) => {
      setDepartments(dep.data.items || []);
      setDesignations(des.data.items || []);
    });
  }, []);

  useEffect(() => {
    if (!employee) return;
    if (tab === "Leave") {
      const isSelfHere = String(user?.employee || "") === String(employee._id);
      if (isSelfHere) {
        Promise.all([
          api.get("/leave/my"),
          api.get("/leave/balance/me"),
          api.get("/leave/types"),
        ])
          .then(([myRes, balRes, typesRes]) => {
            setLeaves(myRes.data.leaves || []);
            setBalance(balRes.data.balance || null);
            setLeaveTypes(typesRes.data.types || []);
          })
          .catch(() => {});
      } else {
        Promise.all([
          api.get(`/leave/employee/${employee._id}`),
          api.get("/leave/types"),
        ])
          .then(([empRes, typesRes]) => {
            setLeaves(empRes.data.leaves || []);
            setBalance(empRes.data.balance || null);
            setLeaveTypes(typesRes.data.types || []);
          })
          .catch(() => {});
      }
    } else if (tab === "Attendance") {
      api
        .get(`/attendance/employee/${employee._id}`)
        .then(({ data }) => setAttendance(data.entries || []))
        .catch(() => {});
    } else if (tab === "Payslips") {
      api
        .get(`/payroll/payslips/employee/${employee._id}`)
        .then(({ data }) => setPayslips(data.payslips || []))
        .catch(() => {});
    } else if (tab === "Documents") {
      api
        .get("/documents", { params: { employeeId: employee._id } })
        .then(({ data }) => setDocuments(data.documents || []))
        .catch(() => {});
    } else if (tab === "Assets") {
      api
        .get("/assets", { params: { employeeId: employee._id } })
        .then(({ data }) => setAssets(data.assets || []))
        .catch(() => {});
    } else if (tab === "Performance") {
      api
        .get("/performance/appraisals", {
          params: { employeeId: employee._id },
        })
        .then(({ data }) => setAppraisals(data.appraisals || []))
        .catch(() => {});
    } else if (tab === "Exit") {
      api
        .get("/exit", { params: { employeeId: employee._id } })
        .then(({ data }) => {
          setExitChecklist(data.checklist);
          setExitForm(
            data.checklist
              ? {
                  noticeStartDate: data.checklist.noticeStartDate
                    ? data.checklist.noticeStartDate.slice(0, 10)
                    : "",
                  lastWorkingDay: data.checklist.lastWorkingDay
                    ? data.checklist.lastWorkingDay.slice(0, 10)
                    : "",
                  reason: data.checklist.reason || "",
                  assetReturnStatus:
                    data.checklist.assetReturnStatus || "PENDING",
                  status: data.checklist.status || "INITIATED",
                  finalSettlementAmount:
                    data.checklist.finalSettlementAmount || "",
                  clearanceIt: !!data.checklist.clearance?.it,
                  clearanceHr: !!data.checklist.clearance?.hr,
                  clearanceFinance: !!data.checklist.clearance?.finance,
                  clearanceManager: !!data.checklist.clearance?.manager,
                }
              : { assetReturnStatus: "PENDING", status: "INITIATED" },
          );
        })
        .catch(() => {});
    } else if (tab === "Salary") {
      api
        .get("/salary/history", { params: { employeeId: employee._id } })
        .then(({ data }) => setSalaryHistory(data.history || []))
        .catch(() => setSalaryHistory([]));
    }
  }, [tab, employee]);

  if (!employee) return <div className="empty">Loading…</div>;
  const isSelf = String(user?.employee || "") === String(employee._id);
  const lockedForSelf = isSelf && !canManage;
  const visibleTabs = TABS.filter((t) => {
    if (
      lockedForSelf &&
      (t === "Exit" || t === "Salary" || t === "Leave" || t === "Attendance")
    ) {
      return false;
    }
    return true;
  });
  const initials = (employee.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setIt = (k) => (e) => setItForm({ ...itForm, [k]: e.target.value });
  const setShift = (k) => (e) =>
    setShiftForm({ ...shiftForm, [k]: e.target.value });
  const setExit = (k) => (e) =>
    setExitForm({
      ...exitForm,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });

  const startEdit = () => {
    setError("");
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setError("");
    setForm(fillForm(employee));
    if (searchParams.get("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = lockedForSelf
        ? {
            phone: form.phone,
            dob: form.dob || undefined,
            gender: form.gender || undefined,
            maritalStatus: form.maritalStatus,
            bloodGroup: form.bloodGroup,
            emergencyContact: {
              name: form.emergencyContactName,
              phone: form.emergencyContactPhone,
              relation: form.emergencyContactRelation,
            },
            address: {
              current: { line1: form.addressCurrent },
              permanent: { line1: form.addressPermanent },
            },
          }
        : {
            empCode: form.empCode,
            name: form.name,
            email: form.email,
            phone: form.phone,
            dob: form.dob || undefined,
            gender: form.gender || undefined,
            maritalStatus: form.maritalStatus,
            bloodGroup: form.bloodGroup,
            department: form.department,
            designation: form.designation,
            joinDate: form.joinDate,
            probationEndDate: form.probationEndDate || undefined,
            employmentType: form.employmentType,
            workLocation: form.workLocation,
            officeBranch: form.officeBranch,
            team: form.team,
            grade: form.grade,
            status: form.status,
            emergencyContact: {
              name: form.emergencyContactName,
              phone: form.emergencyContactPhone,
              relation: form.emergencyContactRelation,
            },
            address: {
              current: { line1: form.addressCurrent },
              permanent: { line1: form.addressPermanent },
            },
          };
      const { data } = await api.patch(`/employees/${id}`, payload);
      setEmployee(data.employee);
      setForm(fillForm(data.employee));
      setEditing(false);
      if (searchParams.get("edit")) {
        searchParams.delete("edit");
        setSearchParams(searchParams, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const saveIT = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        skills: itForm.skills,
        technologyStack: itForm.technologyStack,
        experienceYears:
          itForm.experienceYears === ""
            ? undefined
            : Number(itForm.experienceYears),
      };
      const { data } = await api.patch(`/employees/${id}`, payload);
      setEmployee(data.employee);
      setItForm(fillITForm(data.employee));
      setItEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveShift = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        workMode: shiftForm.workMode,
        shiftAssignment: shiftForm.shiftAssignment,
        workHours:
          shiftForm.workHours === "" ? undefined : Number(shiftForm.workHours),
        weeklyOff: shiftForm.weeklyOff,
      };
      const { data } = await api.patch(`/employees/${id}`, payload);
      setEmployee(data.employee);
      setShiftForm(fillShiftForm(data.employee));
      setShiftEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleWeeklyOff = (day) => {
    const set = new Set(shiftForm.weeklyOff || []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setShiftForm({
      ...shiftForm,
      weeklyOff: WEEK_DAYS.filter((d) => set.has(d)),
    });
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${id}`);
      navigate("/employees");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  // -------- Photo --------
  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const { data } = await api.post(`/employees/${id}/photo`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEmployee(data.employee);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to upload photo");
    } finally {
      setPhotoBusy(false);
      e.target.value = "";
    }
  };

  // -------- Salary structure editing --------
  const openSalaryEdit = () => {
    setSalaryRows(
      employee.salaryStructure?.length
        ? employee.salaryStructure.map((c) => ({
            code: c.code,
            label: c.label,
            amount: c.amount,
          }))
        : [],
    );
    setSalaryEdit(true);
  };
  const addSalaryRow = () =>
    setSalaryRows([...salaryRows, { code: "", label: "", amount: 0 }]);
  const useSalaryTemplate = () =>
    setSalaryRows(
      (DEFAULT_SALARY[employee.country] || []).map((r) => ({ ...r })),
    );
  const updateSalaryRow = (i, k, v) => {
    const next = [...salaryRows];
    next[i] = { ...next[i], [k]: k === "amount" ? Number(v) || 0 : v };
    setSalaryRows(next);
  };
  const removeSalaryRow = (i) =>
    setSalaryRows(salaryRows.filter((_, idx) => idx !== i));
  const saveSalary = async () => {
    setSalarySaving(true);
    try {
      const cleaned = salaryRows
        .filter((r) => r.code && r.label)
        .map((r) => ({
          code: r.code.toUpperCase(),
          label: r.label,
          amount: Number(r.amount) || 0,
        }));
      const { data } = await api.patch(`/employees/${id}`, {
        salaryStructure: cleaned,
      });
      setEmployee(data.employee);
      setSalaryEdit(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save salary");
    } finally {
      setSalarySaving(false);
    }
  };

  const salaryTotal = (employee.salaryStructure || []).reduce(
    (s, c) => s + (c.amount || 0),
    0,
  );

  // -------- Documents --------
  const uploadDocument = async (e) => {
    e.preventDefault();
    const file = docFileRef.current?.files?.[0];
    if (!file) {
      alert("Choose a file first");
      return;
    }
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("employeeId", employee._id);
      fd.append("kind", newDoc.kind);
      if (newDoc.label) fd.append("label", newDoc.label);
      const { data } = await api.post("/documents", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocuments([data.document, ...documents]);
      setNewDoc({ kind: "RESUME", label: "" });
      if (docFileRef.current) docFileRef.current.value = "";
    } catch (err) {
      alert(err.response?.data?.error || "Failed to upload");
    } finally {
      setDocBusy(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Delete this document?")) return;
    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(documents.filter((d) => d._id !== docId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  // -------- Assets --------
  const addAsset = async (e) => {
    e.preventDefault();
    setAssetBusy(true);
    try {
      const { data } = await api.post("/assets", {
        ...newAsset,
        employee: employee._id,
      });
      setAssets([data.asset, ...assets]);
      setNewAsset({ kind: "LAPTOP", tag: "", label: "", serial: "" });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add asset");
    } finally {
      setAssetBusy(false);
    }
  };

  const returnAsset = async (a) => {
    try {
      const { data } = await api.patch(`/assets/${a._id}`, {
        status: "RETURNED",
      });
      setAssets(assets.map((x) => (x._id === a._id ? data.asset : x)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update");
    }
  };

  const deleteAsset = async (a) => {
    if (!confirm("Delete this asset record?")) return;
    try {
      await api.delete(`/assets/${a._id}`);
      setAssets(assets.filter((x) => x._id !== a._id));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  // -------- Performance --------
  const addAppraisal = async (e) => {
    e.preventDefault();
    if (!newAppraisal.period) return;
    setPerfBusy(true);
    try {
      const cleanKpis = (newAppraisal.kpis || [])
        .filter((k) => k.name && k.name.trim())
        .map((k) => ({
          name: k.name,
          target: k.target,
          achieved: k.achieved,
          score:
            k.score === "" || k.score == null ? undefined : Number(k.score),
        }));
      const { data } = await api.post("/performance/appraisals", {
        ...newAppraisal,
        kpis: cleanKpis,
        employee: employee._id,
      });
      setAppraisals([data.appraisal, ...appraisals]);
      setNewAppraisal({ period: "", rating: 3, managerFeedback: "", kpis: [] });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add appraisal");
    } finally {
      setPerfBusy(false);
    }
  };

  const addKpiRow = () => {
    setNewAppraisal({
      ...newAppraisal,
      kpis: [
        ...(newAppraisal.kpis || []),
        { name: "", target: "", achieved: "", score: "" },
      ],
    });
  };
  const updateKpiRow = (idx, key, val) => {
    const next = [...(newAppraisal.kpis || [])];
    next[idx] = { ...next[idx], [key]: val };
    setNewAppraisal({ ...newAppraisal, kpis: next });
  };
  const removeKpiRow = (idx) => {
    setNewAppraisal({
      ...newAppraisal,
      kpis: (newAppraisal.kpis || []).filter((_, i) => i !== idx),
    });
  };

  // -------- Increment --------
  const openIncrement = () => {
    setIncrementError("");
    setIncrementForm({
      newCtc: employee.ctc || "",
      newBasic: employee.basicSalary || "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      reason: "INCREMENT",
    });
    setShowIncrementForm(true);
  };

  const bumpCtcPercent = (pct) => {
    const current = Number(employee.ctc || 0);
    if (!current) return;
    setIncrementForm({
      ...incrementForm,
      newCtc: Math.round(current * (1 + pct / 100)),
    });
  };

  const submitIncrement = async (e) => {
    e.preventDefault();
    setIncrementError("");
    const newCtc = Number(incrementForm.newCtc);
    if (!newCtc || newCtc <= 0) {
      setIncrementError("Enter a valid new CTC");
      return;
    }
    setIncrementBusy(true);
    try {
      const { data } = await api.post("/salary/history", {
        employee: employee._id,
        effectiveFrom: incrementForm.effectiveFrom,
        ctc: newCtc,
        basic:
          incrementForm.newBasic === ""
            ? undefined
            : Number(incrementForm.newBasic),
        reason: incrementForm.reason,
      });
      if (data.employee) setEmployee(data.employee);
      // Refresh the salary history list
      const { data: h } = await api.get("/salary/history", {
        params: { employeeId: employee._id },
      });
      setSalaryHistory(h.history || []);
      setShowIncrementForm(false);
    } catch (err) {
      setIncrementError(
        err.response?.data?.error || "Failed to save increment",
      );
    } finally {
      setIncrementBusy(false);
    }
  };

  // -------- Exit --------
  const saveExit = async (e) => {
    e.preventDefault();
    setExitBusy(true);
    try {
      const payload = {
        employee: employee._id,
        noticeStartDate: exitForm.noticeStartDate || undefined,
        lastWorkingDay: exitForm.lastWorkingDay || undefined,
        reason: exitForm.reason,
        assetReturnStatus: exitForm.assetReturnStatus,
        status: exitForm.status,
        finalSettlementAmount:
          exitForm.finalSettlementAmount === ""
            ? undefined
            : Number(exitForm.finalSettlementAmount),
        clearance: {
          it: !!exitForm.clearanceIt,
          hr: !!exitForm.clearanceHr,
          finance: !!exitForm.clearanceFinance,
          manager: !!exitForm.clearanceManager,
        },
      };
      const { data } = await api.post("/exit", payload);
      setExitChecklist(data.checklist);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setExitBusy(false);
    }
  };

  return (
    <div>
      <Link to="/employees" className="link-muted">
        ← Back to employees
      </Link>

      <div className="page-header" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", width: 64, height: 64 }}>
            {employee.profilePhoto ? (
              <img
                src={employee.profilePhoto}
                alt={employee.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--surface)",
                  boxShadow: "var(--shadow)",
                  display: "block",
                }}
              />
            ) : (
              <div
                className="avatar"
                style={{ width: 64, height: 64, fontSize: 20 }}
              >
                {initials}
              </div>
            )}
            {(canManage || isSelf) && (
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={photoBusy}
                title="Change photo"
                aria-label="Change photo"
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: "2px solid var(--surface)",
                  background: "var(--primary)",
                  color: "#fff",
                  cursor: photoBusy ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  lineHeight: 1,
                  padding: 0,
                  boxShadow: "var(--shadow)",
                }}
              >
                {photoBusy ? (
                  "…"
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </button>
            )}
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              hidden
            />
          </div>
          <div>
            <h1>{employee.name}</h1>
            <p className="muted">
              {employee.empCode} · {employee.designation || "—"} ·{" "}
              {employee.department || "—"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className={`badge ${employee.status === "ACTIVE" ? "active" : employee.status === "EXITED" ? "exited" : "warn"}`}
          >
            {employee.status}
          </span>
          {canManage && login && (
            <button
              className="btn"
              onClick={() => setResetPwOpen(true)}
              title="Reset this employee's sign-in password"
            >
              🔑 Reset password
            </button>
          )}
          {(canManage || isSelf) && tab === "Profile" && !editing && (
            <button className="btn" onClick={startEdit}>
              Edit
            </button>
          )}
          {canManage && tab === "Profile" && !editing && (
            <button
              className="btn danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="tabs-row" style={{ flexWrap: "wrap" }}>
        {visibleTabs.map((t) => (
          <button
            key={t}
            className={`btn ${tab === t ? "primary" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Documents" && counts.documentsCount
              ? ` · ${counts.documentsCount}`
              : ""}
            {t === "Assets" && counts.assetsCount
              ? ` · ${counts.assetsCount}`
              : ""}
            {t === "Performance" && counts.openGoalsCount
              ? ` · ${counts.openGoalsCount}`
              : ""}
          </button>
        ))}
      </div>

      <div className="card">
        {/* ===== PROFILE ===== */}
        {tab === "Profile" && !editing && (
          <dl className="kv">
            <dt>Employee Code</dt>
            <dd>{employee.empCode || "—"}</dd>
            <dt>Full Name</dt>
            <dd>{employee.name || "—"}</dd>
            <dt>Email</dt>
            <dd>{employee.email || "—"}</dd>
            <dt>Phone</dt>
            <dd>{employee.phone || "—"}</dd>
            <dt>Date of birth</dt>
            <dd>{fmtDate(employee.dob)}</dd>
            <dt>Gender</dt>
            <dd>{employee.gender || "—"}</dd>
            <dt>Marital status</dt>
            <dd>{employee.maritalStatus || "—"}</dd>
            <dt>Blood group</dt>
            <dd>{employee.bloodGroup || "—"}</dd>
            <dt>Department</dt>
            <dd>{employee.department || "—"}</dd>
            <dt>Designation</dt>
            <dd>{employee.designation || "—"}</dd>
            <dt>Team</dt>
            <dd>{employee.team || "—"}</dd>
            <dt>Grade / Level</dt>
            <dd>{employee.grade || "—"}</dd>
            <dt>Employment type</dt>
            <dd>{employee.employmentType || "—"}</dd>
            <dt>Work location</dt>
            <dd>{employee.workLocation || "—"}</dd>
            <dt>Office branch</dt>
            <dd>{employee.officeBranch || "—"}</dd>
            <dt>Join Date</dt>
            <dd>{fmtDate(employee.joinDate)}</dd>
            <dt>Probation end</dt>
            <dd>{fmtDate(employee.probationEndDate)}</dd>
            <dt>Status</dt>
            <dd>
              <span
                className={`badge ${employee.status === "ACTIVE" ? "active" : employee.status === "EXITED" ? "exited" : "warn"}`}
              >
                {employee.status}
              </span>
            </dd>
            <dt>Current address</dt>
            <dd>{employee.address?.current?.line1 || "—"}</dd>
            <dt>Permanent address</dt>
            <dd>{employee.address?.permanent?.line1 || "—"}</dd>
            <dt>Emergency contact</dt>
            <dd>
              {employee.emergencyContact?.name
                ? `${employee.emergencyContact.name} (${employee.emergencyContact.relation || "—"}) · ${employee.emergencyContact.phone || "—"}`
                : "—"}
            </dd>
          </dl>
        )}

        {tab === "Profile" && editing && (
          <form onSubmit={save} className="form">
            {error && <div className="error">{error}</div>}
            <h2>Basic info</h2>
            <div className="form-grid">
              {!lockedForSelf && (
                <>
                  <label>
                    Employee Code
                    <input
                      value={form.empCode}
                      onChange={set("empCode")}
                      required
                    />
                  </label>
                  <label>
                    Full Name
                    <input
                      value={form.name}
                      onChange={set("name")}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </label>
                </>
              )}
              <label>
                Phone
                <input value={form.phone} onChange={set("phone")} />
              </label>
              <label>
                Date of birth
                <input type="date" value={form.dob} onChange={set("dob")} />
              </label>
              <label>
                Gender
                <select value={form.gender} onChange={set("gender")}>
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </label>
              <label>
                Marital status
                <select
                  value={form.maritalStatus}
                  onChange={set("maritalStatus")}
                >
                  <option value="">—</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </label>
              <label>
                Blood group
                <input value={form.bloodGroup} onChange={set("bloodGroup")} />
              </label>
            </div>

            {!lockedForSelf && (
              <>
                <h2 style={{ marginTop: 18 }}>Employment</h2>
                <div className="form-grid">
                  <label>
                    Department
                    <select value={form.department} onChange={set("department")}>
                      <option value="">— Select department —</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                      {form.department &&
                        !departments.some((d) => d.name === form.department) && (
                          <option value={form.department}>{form.department}</option>
                        )}
                    </select>
                  </label>
                  <label>
                    Designation
                    <select value={form.designation} onChange={set("designation")}>
                      <option value="">— Select designation —</option>
                      {designations.map((d) => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                      {form.designation &&
                        !designations.some((d) => d.name === form.designation) && (
                          <option value={form.designation}>{form.designation}</option>
                        )}
                    </select>
                  </label>
                  <label>
                    Team
                    <input value={form.team} onChange={set("team")} />
                  </label>
                  <label>
                    Grade
                    <input value={form.grade} onChange={set("grade")} />
                  </label>
                  <label>
                    Employment type
                    <select
                      value={form.employmentType}
                      onChange={set("employmentType")}
                    >
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </label>
                  <label>
                    Work location
                    <input
                      value={form.workLocation}
                      onChange={set("workLocation")}
                    />
                  </label>
                  <label>
                    Office branch
                    <input
                      value={form.officeBranch}
                      onChange={set("officeBranch")}
                    />
                  </label>
                  <label>
                    Join Date
                    <input
                      type="date"
                      value={form.joinDate}
                      onChange={set("joinDate")}
                      required
                    />
                  </label>
                  <label>
                    Probation end
                    <input
                      type="date"
                      value={form.probationEndDate}
                      onChange={set("probationEndDate")}
                    />
                  </label>
                  <label>
                    Status
                    <select value={form.status} onChange={set("status")}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}

            <h2 style={{ marginTop: 18 }}>Address</h2>
            <div className="form-grid">
              <label>
                Current address
                <input
                  value={form.addressCurrent}
                  onChange={set("addressCurrent")}
                  placeholder="Street, city, postal code"
                />
              </label>
              <label>
                Permanent address
                <input
                  value={form.addressPermanent}
                  onChange={set("addressPermanent")}
                  placeholder="Street, city, postal code"
                />
              </label>
            </div>

            <h2 style={{ marginTop: 18 }}>Emergency contact</h2>
            <div className="form-grid">
              <label>
                Name
                <input
                  value={form.emergencyContactName}
                  onChange={set("emergencyContactName")}
                />
              </label>
              <label>
                Phone
                <input
                  value={form.emergencyContactPhone}
                  onChange={set("emergencyContactPhone")}
                />
              </label>
              <label>
                Relation
                <input
                  value={form.emergencyContactRelation}
                  onChange={set("emergencyContactRelation")}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ===== SKILLS & EXPERIENCE ===== */}
        {tab === "Skills" && !itEditing && (
          <>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2>Skills &amp; experience</h2>
              {canManage && (
                <button className="btn" onClick={() => setItEditing(true)}>
                  Edit
                </button>
              )}
            </div>
            <dl className="kv">
              <dt>Skills</dt>
              <dd>
                <TagChips items={employee.skills} />
              </dd>
              <dt>Tech stack</dt>
              <dd>
                <TagChips items={employee.technologyStack} />
              </dd>
              <dt>Experience</dt>
              <dd>
                {employee.experienceYears != null
                  ? `${employee.experienceYears} years`
                  : "—"}
              </dd>
              <dt>Certifications</dt>
              <dd>
                {(employee.certifications || []).length === 0 ? (
                  "—"
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {employee.certifications.map((c, i) => (
                      <li key={i}>
                        {c.name}
                        {c.issuer ? ` · ${c.issuer}` : ""}
                        {c.year ? ` (${c.year})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </dl>
          </>
        )}

        {tab === "Skills" && itEditing && (
          <form onSubmit={saveIT} className="form">
            <h2>Edit skills &amp; experience</h2>
            <div className="form-grid">
              <label>
                Skills
                <TagInput
                  value={itForm.skills || []}
                  onChange={(v) => setItForm({ ...itForm, skills: v })}
                  placeholder="Type a skill and press Enter"
                />
              </label>
              <label>
                Tech stack
                <TagInput
                  value={itForm.technologyStack || []}
                  onChange={(v) => setItForm({ ...itForm, technologyStack: v })}
                  placeholder="Type a tech and press Enter"
                />
              </label>
              <label>
                Experience (years)
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={itForm.experienceYears}
                  onChange={setIt("experienceYears")}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setItEditing(false);
                  setItForm(fillITForm(employee));
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ===== SHIFT ===== */}
        {tab === "Shift" && !shiftEditing && (
          <>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2>Shift &amp; work mode</h2>
              {canManage && (
                <button className="btn" onClick={() => setShiftEditing(true)}>
                  Edit
                </button>
              )}
            </div>
            <dl className="kv">
              <dt>Work mode</dt>
              <dd>{employee.workMode || "—"}</dd>
              <dt>Shift</dt>
              <dd>{employee.shiftAssignment || "—"}</dd>
              <dt>Work hours / day</dt>
              <dd>{employee.workHours ?? "—"}</dd>
              <dt>Weekly off</dt>
              <dd>
                <TagChips items={employee.weeklyOff} />
              </dd>
            </dl>
          </>
        )}

        {tab === "Shift" && shiftEditing && (
          <form onSubmit={saveShift} className="form">
            <h2>Edit shift</h2>
            <div className="form-grid">
              <label>
                Work mode
                <select
                  value={shiftForm.workMode}
                  onChange={setShift("workMode")}
                >
                  <option value="WFO">Work from office</option>
                  <option value="WFH">Work from home</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </label>
              <label>
                Shift
                <input
                  value={shiftForm.shiftAssignment}
                  onChange={setShift("shiftAssignment")}
                />
              </label>
              <label>
                Work hours / day
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={shiftForm.workHours}
                  onChange={setShift("workHours")}
                />
              </label>
              <label>
                Weekly off
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  {WEEK_DAYS.map((d) => {
                    const on = (shiftForm.weeklyOff || []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeeklyOff(d)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`,
                          background: on ? "var(--primary)" : "var(--surface)",
                          color: on ? "#fff" : "var(--text)",
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShiftEditing(false);
                  setShiftForm(fillShiftForm(employee));
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ===== SALARY ===== */}
        {tab === "Salary" && !salaryEdit && (
          <>
            {/* Inline snapshot — single line, no cards */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                flexWrap: "wrap",
                padding: "12px 16px",
                marginBottom: 16,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
              }}
            >
              <span>
                <span className="muted">CTC: </span>
                <b>{fmtMoney(employee.ctc || 0)}</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {" "}
                  /yr
                </span>
              </span>
              <span style={{ color: "var(--border)" }}>|</span>
              <span>
                <span className="muted">Basic: </span>
                <b>{fmtMoney(employee.basicSalary || 0)}</b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {" "}
                  /mo
                </span>
              </span>
              <span style={{ color: "var(--border)" }}>|</span>
              <span>
                <span className="muted">Monthly gross: </span>
                <b>{fmtMoney(salaryTotal)}</b>
              </span>
              <span style={{ color: "var(--border)" }}>|</span>
              <span>
                <span className="muted">Revisions: </span>
                <b>{salaryHistory.length}</b>
              </span>
            </div>

            {/* Increment panel */}
            {showIncrementForm && canManage && (
              <form
                onSubmit={submitIncrement}
                className="form"
                style={{
                  marginBottom: 18,
                  padding: 18,
                  background:
                    "linear-gradient(135deg, var(--primary-50), var(--surface))",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--primary-100)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h2 style={{ margin: 0 }}>Give increment</h2>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowIncrementForm(false)}
                  >
                    Close
                  </button>
                </div>
                {incrementError && (
                  <div className="error">{incrementError}</div>
                )}
                <div className="form-grid">
                  <label>
                    New CTC (annual)
                    <input
                      type="number"
                      value={incrementForm.newCtc}
                      onChange={(e) =>
                        setIncrementForm({
                          ...incrementForm,
                          newCtc: e.target.value,
                        })
                      }
                      required
                      autoFocus
                    />
                    {employee.ctc ? (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        {[5, 10, 15, 20].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => bumpCtcPercent(p)}
                            style={{
                              padding: "4px 10px",
                              border: "1px solid var(--primary-100)",
                              background: "var(--surface)",
                              color: "var(--primary-600)",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            +{p}%
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>
                  <label>
                    New basic (optional)
                    <input
                      type="number"
                      value={incrementForm.newBasic}
                      onChange={(e) =>
                        setIncrementForm({
                          ...incrementForm,
                          newBasic: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Effective from
                    <input
                      type="date"
                      value={incrementForm.effectiveFrom}
                      onChange={(e) =>
                        setIncrementForm({
                          ...incrementForm,
                          effectiveFrom: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Reason
                    <select
                      value={incrementForm.reason}
                      onChange={(e) =>
                        setIncrementForm({
                          ...incrementForm,
                          reason: e.target.value,
                        })
                      }
                    >
                      <option value="INCREMENT">Increment</option>
                      <option value="PROMOTION">Promotion</option>
                      <option value="REVISION">Revision</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                    </select>
                  </label>
                </div>
                {employee.ctc && incrementForm.newCtc ? (
                  <div
                    className="muted"
                    style={{ marginTop: 10, fontSize: 13 }}
                  >
                    Change:{" "}
                    <b
                      style={{
                        color:
                          Number(incrementForm.newCtc) >= Number(employee.ctc)
                            ? "var(--success)"
                            : "var(--danger)",
                      }}
                    >
                      {Number(incrementForm.newCtc) >= Number(employee.ctc)
                        ? "+"
                        : ""}
                      {fmtMoney(
                        Number(incrementForm.newCtc) - Number(employee.ctc),
                      )}{" "}
                      (
                      {(
                        ((Number(incrementForm.newCtc) - Number(employee.ctc)) /
                          Number(employee.ctc)) *
                        100
                      ).toFixed(1)}
                      %)
                    </b>
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="btn primary"
                  disabled={incrementBusy}
                  style={{ marginTop: 14 }}
                >
                  {incrementBusy ? "Saving…" : "Save increment"}
                </button>
              </form>
            )}

            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2>Salary structure</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="tag-pill">
                  Monthly total: {fmtMoney(salaryTotal)}
                </span>
                {canManage && !showIncrementForm && (
                  <button className="btn primary" onClick={openIncrement}>
                    📈 Give increment
                  </button>
                )}
                {canManage && (
                  <button className="btn" onClick={openSalaryEdit}>
                    Edit structure
                  </button>
                )}
              </div>
            </div>
            {(employee.salaryStructure || []).length === 0 ? (
              <div className="empty">
                <p style={{ marginTop: 0 }}>No salary structure set yet.</p>
                {canManage && (
                  <button className="btn primary" onClick={openSalaryEdit}>
                    Set salary structure
                  </button>
                )}
              </div>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Component</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.salaryStructure.map((c, i) => (
                    <tr key={i}>
                      <td>
                        <code>{c.code}</code>
                      </td>
                      <td>{c.label}</td>
                      <td style={{ textAlign: "right" }}>
                        {fmtMoney(c.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {salaryHistory.length > 0 && (
              <>
                <h2 style={{ marginTop: 28 }}>Salary history</h2>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Effective from</th>
                      <th>Reason</th>
                      <th style={{ textAlign: "right" }}>CTC</th>
                      <th style={{ textAlign: "right" }}>Change</th>
                      <th style={{ textAlign: "right" }}>Basic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((row, i) => {
                      const prev = salaryHistory[i + 1];
                      const delta = prev
                        ? Number(row.ctc || 0) - Number(prev.ctc || 0)
                        : 0;
                      const pct =
                        prev && prev.ctc ? (delta / Number(prev.ctc)) * 100 : 0;
                      const reasonColor = {
                        INITIAL: { bg: "#f1f5f9", fg: "#475569" },
                        INCREMENT: { bg: "#dcfce7", fg: "#15803d" },
                        PROMOTION: { bg: "#fef3c7", fg: "#b45309" },
                        REVISION: { bg: "#eef2ff", fg: "#4338ca" },
                        ADJUSTMENT: { bg: "#fee2e2", fg: "#b91c1c" },
                      }[row.reason] || { bg: "#f1f5f9", fg: "#475569" };
                      return (
                        <tr key={row._id}>
                          <td>{fmtDate(row.effectiveFrom)}</td>
                          <td>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                background: reasonColor.bg,
                                color: reasonColor.fg,
                              }}
                            >
                              {row.reason}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {fmtMoney(row.ctc)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {prev ? (
                              <span
                                style={{
                                  color:
                                    delta > 0
                                      ? "var(--success)"
                                      : delta < 0
                                        ? "var(--danger)"
                                        : "var(--text-muted)",
                                  fontWeight: 500,
                                }}
                              >
                                {delta > 0 ? "+" : ""}
                                {fmtMoney(delta)}
                                {prev.ctc
                                  ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`
                                  : ""}
                              </span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {fmtMoney(row.basic)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        {tab === "Salary" && salaryEdit && (
          <>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2>Edit salary structure</h2>
              <button className="btn" onClick={useSalaryTemplate}>
                Apply template
              </button>
            </div>
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Code</th>
                  <th>Component</th>
                  <th style={{ width: 160 }}>Amount</th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">
                      No components. Click "Apply template" or "+ Add row".
                    </td>
                  </tr>
                )}
                {salaryRows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="input"
                        value={r.code}
                        onChange={(e) =>
                          updateSalaryRow(i, "code", e.target.value)
                        }
                        placeholder="Enter code"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        value={r.label}
                        onChange={(e) =>
                          updateSalaryRow(i, "label", e.target.value)
                        }
                        placeholder="Enter label"
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        value={r.amount}
                        onChange={(e) =>
                          updateSalaryRow(i, "amount", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="row-icon-btn danger"
                        onClick={() => removeSalaryRow(i)}
                        title="Remove"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <button className="btn" onClick={addSalaryRow}>
                + Add row
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn"
                  onClick={() => setSalaryEdit(false)}
                  disabled={salarySaving}
                >
                  Cancel
                </button>
                <button
                  className="btn primary"
                  onClick={saveSalary}
                  disabled={salarySaving}
                >
                  {salarySaving ? "Saving…" : "Save salary"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== LEAVE ===== */}
        {tab === "Leave" && (
          <>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2>Leave balance &amp; history</h2>
              {isSelf && (
                <button
                  className="btn primary"
                  onClick={() => {
                    setLeaveApplyError("");
                    setLeaveApplyForm({
                      type: leaveTypes[0]?.code || "",
                      from: "",
                      to: "",
                      reason: "",
                    });
                    setLeaveApplyOpen(true);
                  }}
                >
                  + Apply for leave
                </button>
              )}
            </div>

            {balance?.balances && Object.keys(balance.balances).length > 0 && (
              <div
                className="kpi-row"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Object.keys(balance.balances).length, 4)}, 1fr)`,
                  marginBottom: 16,
                }}
              >
                {Object.entries(balance.balances).map(([code, n]) => (
                  <div key={code} className="kpi-card">
                    <div className="kpi-label">{code}</div>
                    <div className="kpi-value">{n}</div>
                    <div className="kpi-foot">days remaining</div>
                  </div>
                ))}
              </div>
            )}

            <table className="modern-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      No leave records.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <span className="tag-pill">{l.type}</span>
                      </td>
                      <td>{fmtDate(l.from)}</td>
                      <td>{fmtDate(l.to)}</td>
                      <td>{l.days}</td>
                      <td>
                        <span
                          className={`badge ${l.status === "APPROVED" ? "active" : l.status === "REJECTED" ? "exited" : "warn"}`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ===== ATTENDANCE ===== */}
        {tab === "Attendance" && (
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
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No attendance records.
                  </td>
                </tr>
              ) : (
                attendance.map((e) => (
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
        )}

        {/* ===== DOCUMENTS ===== */}
        {tab === "Documents" && (
          <>
            {can("documents.write") && !lockedForSelf && (
              <form
                onSubmit={uploadDocument}
                className="form"
                style={{
                  marginBottom: 18,
                  padding: 14,
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <h2 style={{ marginTop: 0 }}>Upload document</h2>
                <div className="form-grid">
                  <label>
                    Kind
                    <select
                      value={newDoc.kind}
                      onChange={(e) =>
                        setNewDoc({ ...newDoc, kind: e.target.value })
                      }
                    >
                      {DOCUMENT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Label (optional)
                    <input
                      value={newDoc.label}
                      onChange={(e) =>
                        setNewDoc({ ...newDoc, label: e.target.value })
                      }
                      placeholder="e.g. 2026 CV"
                    />
                  </label>
                  <label>
                    File
                    <input ref={docFileRef} type="file" />
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={docBusy}
                  style={{ marginTop: 10 }}
                >
                  {docBusy ? "Uploading…" : "Upload"}
                </button>
              </form>
            )}

            <table className="modern-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Label</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      No documents.
                    </td>
                  </tr>
                ) : (
                  documents.map((d) => (
                    <tr key={d._id}>
                      <td>
                        <span className="tag-pill">
                          {d.kind.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{d.label || "—"}</td>
                      <td>
                        <a href={d.filePath} target="_blank" rel="noreferrer">
                          {d.fileName}
                        </a>
                      </td>
                      <td>{fmtBytes(d.size)}</td>
                      <td>{fmtDate(d.createdAt)}</td>
                      <td>
                        {can("documents.write") && !lockedForSelf && (
                          <button
                            className="row-icon-btn danger"
                            onClick={() => deleteDocument(d._id)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ===== ASSETS (view-only — manage from the Assets module) ===== */}
        {tab === "Assets" && (
          <>
            <div
              className="card-head"
              style={{
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Assigned assets</h2>
            </div>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Label</th>
                  <th>Tag</th>
                  <th>Serial</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      No assets assigned.
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <span className="tag-pill">
                          {a.kind.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>{a.label || "—"}</td>
                      <td>{a.tag || "—"}</td>
                      <td>{a.serial || "—"}</td>
                      <td>
                        <span
                          className={`badge ${a.status === "ASSIGNED" ? "active" : a.status === "RETURNED" ? "exited" : "warn"}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>{fmtDate(a.assignedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ===== PERFORMANCE (ratings + KPIs) ===== */}
        {tab === "Performance" &&
          (() => {
            const avgRating = appraisals.length
              ? (
                  appraisals.reduce((s, a) => s + (a.rating || 0), 0) /
                  appraisals.length
                ).toFixed(1)
              : "—";
            const latest = appraisals[0];
            const totalKpis = appraisals.reduce(
              (s, a) => s + (a.kpis?.length || 0),
              0,
            );

            return (
              <>
                {/* Inline summary — no cards */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    flexWrap: "wrap",
                    padding: "12px 16px",
                    marginBottom: 16,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 14,
                  }}
                >
                  <span>
                    <span className="muted">Avg: </span>
                    <b>
                      {avgRating}
                      {avgRating !== "—" ? "/5" : ""}
                    </b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {" "}
                      · {appraisals.length} review
                      {appraisals.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <span>
                    <span className="muted">Latest: </span>
                    <b>{latest?.period || "—"}</b>
                    {latest && (
                      <span
                        style={{
                          color: "#f59e0b",
                          marginLeft: 8,
                          letterSpacing: 1,
                        }}
                      >
                        {"★".repeat(latest.rating || 0)}
                      </span>
                    )}
                  </span>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <span>
                    <span className="muted">KPIs tracked: </span>
                    <b>{totalKpis}</b>
                  </span>
                </div>

                {/* ----- RATINGS ----- */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    Performance reviews{" "}
                    <span
                      className="muted"
                      style={{ fontWeight: 400, fontSize: 14 }}
                    >
                      · {appraisals.length}
                    </span>
                  </h2>
                  {can("performance.write") && (
                    <button
                      className={`btn ${showAppraisalForm ? "" : "primary"}`}
                      onClick={() => setShowAppraisalForm(!showAppraisalForm)}
                    >
                      {showAppraisalForm ? "Cancel" : "+ New review"}
                    </button>
                  )}
                </div>

                {showAppraisalForm && can("performance.write") && (
                  <form
                    onSubmit={(e) => {
                      addAppraisal(e);
                      setShowAppraisalForm(false);
                    }}
                    className="form"
                    style={{
                      marginBottom: 16,
                      padding: 18,
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        Period
                        <select
                          value={newAppraisal.period}
                          onChange={(e) =>
                            setNewAppraisal({
                              ...newAppraisal,
                              period: e.target.value,
                            })
                          }
                          required
                          autoFocus
                        >
                          <option value="">— Select period —</option>
                          {reviewPeriodOptions().map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Overall rating
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            marginTop: 4,
                            alignItems: "center",
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setNewAppraisal({ ...newAppraisal, rating: n })
                              }
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 28,
                                padding: 2,
                                lineHeight: 1,
                                color:
                                  n <= newAppraisal.rating
                                    ? "#f59e0b"
                                    : "#cbd5e1",
                              }}
                              aria-label={`Rate ${n}`}
                            >
                              ★
                            </button>
                          ))}
                          <span
                            className="muted"
                            style={{ marginLeft: 6, fontSize: 13 }}
                          >
                            {newAppraisal.rating}/5
                          </span>
                        </div>
                      </label>
                    </div>

                    <label style={{ display: "block", marginTop: 12 }}>
                      Manager note
                      <textarea
                        value={newAppraisal.managerFeedback}
                        onChange={(e) =>
                          setNewAppraisal({
                            ...newAppraisal,
                            managerFeedback: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="Strengths, areas to improve, key wins this period…"
                        style={{
                          width: "100%",
                          marginTop: 4,
                          padding: "10px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          fontSize: 14,
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </label>

                    <div style={{ marginTop: 16 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <label
                          style={{ fontWeight: 600, fontSize: 14, margin: 0 }}
                        >
                          KPIs
                        </label>
                        <button
                          type="button"
                          className="btn"
                          onClick={addKpiRow}
                        >
                          + Add KPI
                        </button>
                      </div>
                      {(newAppraisal.kpis || []).length === 0 ? (
                        <div
                          className="muted"
                          style={{ fontSize: 13, padding: "8px 0" }}
                        >
                          No KPIs added yet. Click "+ Add KPI" to record a
                          specific metric (e.g. "Ship rate", target 4 /
                          quarter).
                        </div>
                      ) : (
                        <table className="modern-table">
                          <thead>
                            <tr>
                              <th>KPI</th>
                              <th>Target</th>
                              <th>Achieved</th>
                              <th style={{ width: 90 }}>Score</th>
                              <th style={{ width: 40 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {newAppraisal.kpis.map((k, idx) => (
                              <tr key={idx}>
                                <td>
                                  <input
                                    className="input"
                                    value={k.name}
                                    onChange={(e) =>
                                      updateKpiRow(idx, "name", e.target.value)
                                    }
                                    placeholder="e.g. Code review turnaround"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="input"
                                    value={k.target}
                                    onChange={(e) =>
                                      updateKpiRow(
                                        idx,
                                        "target",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="≤ 24h"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="input"
                                    value={k.achieved}
                                    onChange={(e) =>
                                      updateKpiRow(
                                        idx,
                                        "achieved",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="18h"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={k.score}
                                    onChange={(e) =>
                                      updateKpiRow(idx, "score", e.target.value)
                                    }
                                    placeholder="0–5"
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="row-icon-btn danger"
                                    onClick={() => removeKpiRow(idx)}
                                    title="Remove"
                                  >
                                    🗑
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn primary"
                      disabled={perfBusy}
                      style={{ marginTop: 16 }}
                    >
                      {perfBusy ? "Saving…" : "Save review"}
                    </button>
                  </form>
                )}

                {appraisals.length === 0 ? (
                  <div className="empty" style={{ padding: 32 }}>
                    No performance reviews yet.
                    {can("performance.write") && !showAppraisalForm && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn primary"
                          onClick={() => setShowAppraisalForm(true)}
                        >
                          Add the first review
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {appraisals.map((a) => (
                      <div
                        key={a._id}
                        style={{
                          padding: 18,
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 16 }}>
                            {a.period}
                          </span>
                          <span
                            style={{
                              color: "#f59e0b",
                              fontSize: 18,
                              letterSpacing: 2,
                            }}
                          >
                            {"★".repeat(a.rating || 0)}
                            <span style={{ color: "#cbd5e1" }}>
                              {"★".repeat(5 - (a.rating || 0))}
                            </span>
                          </span>
                          <span className="muted" style={{ fontSize: 13 }}>
                            {a.rating || 0}/5
                          </span>
                          <div style={{ flex: 1 }} />
                          <span className="muted" style={{ fontSize: 12 }}>
                            {fmtDate(a.reviewedAt)}
                          </span>
                        </div>

                        {a.managerFeedback && (
                          <div
                            style={{
                              borderLeft: "3px solid var(--primary)",
                              paddingLeft: 12,
                              color: "var(--text)",
                              fontSize: 14,
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              marginBottom: a.kpis?.length ? 14 : 0,
                            }}
                          >
                            {a.managerFeedback}
                          </div>
                        )}

                        {a.kpis && a.kpis.length > 0 && (
                          <table
                            className="modern-table"
                            style={{ marginTop: 8 }}
                          >
                            <thead>
                              <tr>
                                <th>KPI</th>
                                <th>Target</th>
                                <th>Achieved</th>
                                <th style={{ textAlign: "right" }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {a.kpis.map((k, i) => (
                                <tr key={i}>
                                  <td>
                                    <b>{k.name}</b>
                                  </td>
                                  <td>{k.target || "—"}</td>
                                  <td>{k.achieved || "—"}</td>
                                  <td style={{ textAlign: "right" }}>
                                    {k.score != null ? (
                                      <span
                                        style={{
                                          color: "#f59e0b",
                                          letterSpacing: 1,
                                        }}
                                      >
                                        {"★".repeat(Math.round(k.score))}
                                        <span
                                          className="muted"
                                          style={{
                                            marginLeft: 6,
                                            fontSize: 12,
                                            letterSpacing: 0,
                                          }}
                                        >
                                          {k.score}/5
                                        </span>
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}

        {/* ===== EXIT ===== */}
        {tab === "Exit" && (
          <form onSubmit={saveExit} className="form">
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h2 style={{ marginTop: 0 }}>Exit checklist</h2>
              {exitChecklist && (
                <span className="badge warn">{exitChecklist.status}</span>
              )}
            </div>
            <div className="form-grid">
              <label>
                Notice start
                <input
                  type="date"
                  value={exitForm.noticeStartDate || ""}
                  onChange={setExit("noticeStartDate")}
                />
              </label>
              <label>
                Last working day
                <input
                  type="date"
                  value={exitForm.lastWorkingDay || ""}
                  onChange={setExit("lastWorkingDay")}
                />
              </label>
              <label>
                Reason
                <input
                  value={exitForm.reason || ""}
                  onChange={setExit("reason")}
                  placeholder="Resignation / Termination / End of contract"
                />
              </label>
              <label>
                Status
                <select
                  value={exitForm.status || "INITIATED"}
                  onChange={setExit("status")}
                >
                  <option value="INITIATED">Initiated</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="CLEARED">Cleared</option>
                  <option value="SETTLED">Settled</option>
                </select>
              </label>
              <label>
                Asset return
                <select
                  value={exitForm.assetReturnStatus || "PENDING"}
                  onChange={setExit("assetReturnStatus")}
                >
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="COMPLETE">Complete</option>
                </select>
              </label>
              <label>
                Final settlement amount
                <input
                  type="number"
                  value={exitForm.finalSettlementAmount || ""}
                  onChange={setExit("finalSettlementAmount")}
                />
              </label>
            </div>

            <h2 style={{ marginTop: 18 }}>Clearance</h2>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <label>
                <input
                  type="checkbox"
                  checked={!!exitForm.clearanceIt}
                  onChange={setExit("clearanceIt")}
                />{" "}
                IT
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!exitForm.clearanceHr}
                  onChange={setExit("clearanceHr")}
                />{" "}
                HR
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!exitForm.clearanceFinance}
                  onChange={setExit("clearanceFinance")}
                />{" "}
                Finance
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!exitForm.clearanceManager}
                  onChange={setExit("clearanceManager")}
                />{" "}
                Manager
              </label>
            </div>

            {can("exit.write") && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={exitBusy}
                >
                  {exitBusy
                    ? "Saving…"
                    : exitChecklist
                      ? "Update"
                      : "Create checklist"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* ===== PAYSLIPS ===== */}
        {tab === "Payslips" && (
          <table className="modern-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty">
                    No payslips for this employee yet.
                  </td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <b>{p.period}</b>
                    </td>
                    <td>{fmtMoney(p.gross)}</td>
                    <td>{fmtMoney(p.totalDeduction)}</td>
                    <td>
                      <b>{fmtMoney(p.net)}</b>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {resetPwOpen && (
        <ResetPasswordModal
          employee={employee}
          login={login}
          onClose={() => setResetPwOpen(false)}
          onSaved={(updatedLogin) => setLogin(updatedLogin)}
        />
      )}

      {leaveApplyOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !leaveApplyBusy && setLeaveApplyOpen(false)}
        >
          <form
            className="modal"
            style={{ width: "min(480px, calc(100vw - 32px))" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              setLeaveApplyError("");
              setLeaveApplyBusy(true);
              try {
                await api.post("/leave/apply", leaveApplyForm);
                const [myRes, balRes] = await Promise.all([
                  api.get("/leave/my"),
                  api.get("/leave/balance/me"),
                ]);
                setLeaves(myRes.data.leaves || []);
                setBalance(balRes.data.balance || null);
                setLeaveApplyOpen(false);
              } catch (err) {
                setLeaveApplyError(
                  err.response?.data?.error || "Failed to apply",
                );
              } finally {
                setLeaveApplyBusy(false);
              }
            }}
          >
            <div className="modal-icon info">🌴</div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Apply for leave</h2>
            <p className="muted small" style={{ margin: "0 0 14px" }}>
              Your request goes to HR for approval.
            </p>
            {leaveApplyError && (
              <div className="error" style={{ marginBottom: 12 }}>
                {leaveApplyError}
              </div>
            )}
            <div className="form">
              <label>
                Type
                <select
                  value={leaveApplyForm.type}
                  onChange={(e) =>
                    setLeaveApplyForm({
                      ...leaveApplyForm,
                      type: e.target.value,
                    })
                  }
                  required
                >
                  {leaveTypes.length === 0 && <option value="">—</option>}
                  {leaveTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  From
                  <input
                    type="date"
                    value={leaveApplyForm.from}
                    onChange={(e) =>
                      setLeaveApplyForm({
                        ...leaveApplyForm,
                        from: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={leaveApplyForm.to}
                    onChange={(e) =>
                      setLeaveApplyForm({
                        ...leaveApplyForm,
                        to: e.target.value,
                      })
                    }
                    required
                  />
                </label>
              </div>
              <label>
                Reason
                <textarea
                  rows={3}
                  value={leaveApplyForm.reason}
                  onChange={(e) =>
                    setLeaveApplyForm({
                      ...leaveApplyForm,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </label>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setLeaveApplyOpen(false)}
                disabled={leaveApplyBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={leaveApplyBusy}
              >
                {leaveApplyBusy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div
          className="modal-backdrop"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon danger">⚠</div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Delete employee?</h2>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              This permanently removes <b>{employee.name}</b> and any linked
              sign-in account. This action cannot be undone.
            </p>
            <p className="muted small" style={{ margin: "0 0 18px" }}>
              Tip: to keep history, set the status to <b>EXITED</b> via Edit
              instead.
            </p>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                className="btn"
                onClick={() => setConfirmDelete(false)}
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

// ============== Reset password modal ==============
function ResetPasswordModal({ employee, login, onClose, onSaved }) {
  const [mode, setMode] = useState("auto"); // "auto" | "manual"
  const [manualPw, setManualPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultPw, setResultPw] = useState(""); // password returned from server
  const [resultEmail, setResultEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "manual" && manualPw.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const body = mode === "manual" ? { newPassword: manualPw } : {};
      const { data } = await api.post(`/employees/${employee._id}/reset-password`, body);
      setResultPw(data.newPassword);
      setResultEmail(data.login?.email || login?.email || employee.email);
      if (data.login && onSaved) onSaved(data.login);
    } catch (err) {
      setError(err.response?.data?.error || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(resultPw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div
      onClick={() => !busy && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "60px 16px", zIndex: 50, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)", overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--primary-50)", color: "var(--primary-600)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}
          >🔑</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Reset password</h2>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
              For <b>{employee.name}</b> · {login?.email || employee.email || <i>(no email on file)</i>}
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {resultPw ? (
            <>
              <div
                style={{
                  padding: 14, borderRadius: 12,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                  Sign-in email
                </div>
                <code
                  style={{
                    display: "block", padding: "10px 12px", marginBottom: 12,
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 14, fontFamily: "ui-monospace, monospace",
                    userSelect: "all",
                  }}
                >{resultEmail}</code>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                  New temporary password
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <code
                    style={{
                      flex: 1, padding: "10px 12px",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 8, fontSize: 15, fontFamily: "ui-monospace, monospace",
                      letterSpacing: 1, userSelect: "all",
                    }}
                  >{resultPw}</code>
                  <button type="button" className="btn primary" onClick={copy}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
                ⚠ This password is shown only once. Share it with the employee — they should change it on next sign-in.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

              <div
                style={{
                  display: "flex", padding: 4, marginBottom: 14,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                {[
                  { key: "auto", label: "🎲 Generate" },
                  { key: "manual", label: "✏ Choose myself" },
                ].map((m) => {
                  const on = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMode(m.key)}
                      style={{
                        flex: 1, padding: "8px 10px", border: "none", borderRadius: 7,
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                        background: on ? "var(--surface)" : "transparent",
                        color: on ? "var(--text)" : "var(--text-muted)",
                        boxShadow: on ? "var(--shadow-sm)" : "none",
                      }}
                    >{m.label}</button>
                  );
                })}
              </div>

              {mode === "auto" ? (
                <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
                  A secure 12-character temporary password will be generated and shown to you once. Share it with the employee.
                </p>
              ) : (
                <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    New password <span style={{ color: "var(--danger)" }}>*</span>
                  </span>
                  <input
                    type="text"
                    value={manualPw}
                    onChange={(e) => setManualPw(e.target.value)}
                    minLength={6}
                    autoFocus
                    style={{
                      padding: "10px 14px", border: "1px solid var(--border)",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>At least 6 characters.</span>
                </label>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? "Saving…" : "Reset password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
