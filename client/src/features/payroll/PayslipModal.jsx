import { useAuth } from '../../context/AuthContext';

const money = (n) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

export function periodParts(period) {
  const [y, m] = (period || '').split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return { month: isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { month: 'long' }), year: y || '—' };
}
export function periodLabel(period) {
  const { month, year } = periodParts(period);
  return `${month} ${year}`;
}

export default function PayslipModal({ payslip, employee, onClose }) {
  const { company } = useAuth();
  if (!payslip) return null;
  const emp = employee || payslip.employee || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal payslip-sheet" onClick={(e) => e.stopPropagation()} style={{ width: 'min(580px, calc(100vw - 32px))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{company?.name || 'Payslip'}</div>
            <div className="muted small">Payslip · {periodLabel(payslip.period)}</div>
          </div>
          <span className="badge active">{payslip.country || 'IN'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
          <div><div className="muted small">Employee</div><b>{emp.name || '—'}</b></div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted small">Code · Department</div>
            <b>{emp.empCode || '—'}{emp.department ? ` · ${emp.department}` : ''}</b>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div className="muted small" style={{ fontWeight: 700, marginBottom: 6 }}>EARNINGS</div>
            {(payslip.earnings || []).map((e, i) => (
              <div key={i} className="ps-ln"><span>{e.label}</span><span>{money(e.amount)}</span></div>
            ))}
            <div className="ps-ln ps-total"><span>Gross</span><span>{money(payslip.gross)}</span></div>
          </div>
          <div>
            <div className="muted small" style={{ fontWeight: 700, marginBottom: 6 }}>DEDUCTIONS</div>
            {(payslip.deductions || []).length === 0
              ? <div className="muted small">None</div>
              : (payslip.deductions || []).map((d, i) => (
                  <div key={i} className="ps-ln"><span>{d.label}</span><span>{money(d.amount)}</span></div>
                ))}
            <div className="ps-ln ps-total"><span>Total</span><span>{money(payslip.totalDeduction)}</span></div>
          </div>
        </div>

        <div className="ps-net"><span>Net pay</span><span>{money(payslip.net)}</span></div>

        <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={() => window.print()}>⭳ Download PDF</button>
        </div>
      </div>
    </div>
  );
}
