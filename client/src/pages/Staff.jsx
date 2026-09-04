import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { DataTable, Field, FormError, Modal, ModalActions, PageHead, Status, fmtDate } from "../components/ui";
function StaffModal({ onClose, onSaved }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "staff" }), [err, setErr] = useState("");
  const set = (k, v) => setF((previous) => ({ ...previous, [k]: v }));
  const save = async (e) => { e.preventDefault(); try { await api("/staff", { method: "POST", body: JSON.stringify(f) }); onSaved(); } catch (e) { setErr(e.message); } };
  return <Modal title="Add Staff Member" subtitle="Staff can work with inventory; owner/admin control access." onClose={onClose}><FormError text={err} /><form onSubmit={save}><div className="formgrid"><Field label="Name"><input required className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field><Field label="Email"><input required type="email" className="input" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field><Field label="Temporary Password"><input required minLength="8" type="password" className="input" value={f.password} onChange={(e) => set("password", e.target.value)} /></Field><Field label="Role"><select className="select" value={f.role} onChange={(e) => set("role", e.target.value)}><option value="staff">Staff</option><option value="admin">Admin</option></select></Field></div><ModalActions onClose={onClose} label="Create Staff" /></form></Modal>;
}
export default function Staff() {
  const [rows, setRows] = useState([]), [open, setOpen] = useState(false);
  const load = () => api("/staff").then(setRows);
  useEffect(() => {
    load();
  }, []);
  return <div className="content"><PageHead title="Staff & Roles" desc="Invite operational staff while keeping company data isolated." action={<button className="btn primary" onClick={() => setOpen(true)}><UserPlus size={15} /> Add Staff</button>} /><DataTable headers={["Name", "Email", "Role", "Status", "Created"]} rows={rows.map((x) => [<b>{x.name}</b>, x.email, <span className="role">{x.role}</span>, <Status status={x.status} />, fmtDate(x.createdAt)])} />{open && <StaffModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}</div>;
}
