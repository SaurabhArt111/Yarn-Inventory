import React from "react";
import { Package, Search, X } from "lucide-react";

export const kg = (n) =>
    `${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG`;
export const num = (n) => Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (n) =>
    n
        ? new Date(n).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

export function Metric({ label, value, icon: Icon }) {
    return <div className="metric"><div className="metric-icon"><Icon size={17} /></div><span>{label}</span><strong>{value}</strong></div>;
}

export function Status({ status }) {
    return <span className={`status ${status}`}>{status}</span>;
}
export function PageHead({ title, desc, action }) {
    return <div className="page-head"><div><h2>{title}</h2><p>{desc}</p></div>{action}</div>;
}
export function Toolbar({ value, onChange, placeholder }) {
    return <div className="toolbar"><div className="searchbox"><Search size={15} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div></div>;
}
export function DataTable({ headers, rows = [], empty = "No records found.", loading = false }) {
    return <div className="table-shell">{loading ? <div className="table-loading">Loading records…</div> : rows.length ? <div className="table-scroll"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{(Array.isArray(r) ? r : r.props?.values || []).map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div> : <Empty title={empty} />}</div>;
}
export function Modal({ title, subtitle, onClose, children }) {
    return <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="close" onClick={onClose}><X size={18} /></button></div><div className="modal-body">{children}</div></div></div>;
}
export function ModalActions({ onClose, label }) {
    return <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary">{label}</button></div>;
}
export function Field({ label, children, full }) {
    return <div className={`field ${full ? "full" : ""}`}><label>{label}</label>{children}</div>;
}
export function SelectField({ label, value, set, options }) {
    return <Field label={label}><select required className="select" value={value} onChange={(e) => set(e.target.value)}><option value="">Select {label}</option>{options.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}</select></Field>;
}
export function FormError({ text }) { return text ? <div className="alert error">{text}</div> : null; }
export function Empty({ title, text }) { return <div className="empty"><div className="empty-icon"><Package size={18} /></div><b>{title}</b>{text && <p>{text}</p>}</div>; }
export function Loading() { return <div className="content"><div className="loading">Loading workspace…</div></div>; }
export function PageError({ text }) { return <div className="content"><div className="alert error">{text}</div></div>; }
