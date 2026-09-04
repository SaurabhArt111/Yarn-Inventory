import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, BarChart3, Building2, Database, Factory, LayoutDashboard, LogOut, Menu, Package, ShieldCheck, Users, X } from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api, clearSession, saveSession, session } from "./lib/api";
import Dashboard from "./pages/Dashboard";
import Stock from "./pages/Stock";
import Beams from "./pages/Beams";
import Analytics from "./pages/Analytics";
import Masters from "./pages/Masters";
import Staff from "./pages/Staff";
import QualityDetail from "./pages/QualityDetail";
import { Field } from "./components/ui";
import "./styles.css";

function App() {
  const [s, setS] = useState(session());
  const [auth, setAuth] = useState(!!s.user);
  useEffect(() => {
    const stop = (e) => { if (e.target.matches?.("input[type=number]")) e.preventDefault(); };
    document.addEventListener("wheel", stop, { passive: false });
    return () => document.removeEventListener("wheel", stop);
  }, []);
  if (!auth) return <Auth onLogin={(d) => { saveSession(d); setS({ user: d.user, company: d.company }); setAuth(true); }} />;
  return <BrowserRouter><Shell session={s} onLogout={async () => { try { await api("/auth/logout", { method: "POST" }); } catch {} clearSession(); setAuth(false); }} /></BrowserRouter>;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"), [loading, setLoading] = useState(false), [err, setErr] = useState("");
  const [f, setF] = useState({ companyName: "", companyCode: "", name: "", email: "", password: "" });
  const set = (k, v) => setF((previous) => ({ ...previous, [k]: v }));
  const submit = async (e) => { e.preventDefault(); setLoading(true); setErr(""); try { onLogin(await api("/auth/" + mode, { method: "POST", body: JSON.stringify(f) })); } catch (e) { setErr(e.message); } finally { setLoading(false); } };
  return <div className="auth"><div className="auth-panel"><div className="auth-brand"><div className="brand-mark">YI</div><div><b>Yarn Inventory</b><span>Management SaaS</span></div></div><div className="auth-copy"><div className="eyebrow">YARN OPERATIONS</div><h1>{mode === "login" ? "Welcome back." : "Create your company workspace."}</h1><p>{mode === "login" ? "Securely manage stock, beams, parties and production." : "Start a private inventory workspace for your company and team."}</p></div>{err && <div className="alert error"><AlertTriangle size={16} />{err}</div>}<form onSubmit={submit} className="auth-form">{mode === "register" && <><Field label="Company Name"><input className="input" required value={f.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Your company name" /></Field><Field label="Company Code (optional)"><input className="input" value={f.companyCode} onChange={(e) => set("companyCode", e.target.value)} placeholder="AUTO-CODE" /></Field><Field label="Owner Name"><input className="input" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" /></Field></>}<Field label="Email"><input className="input" required type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" /></Field><Field label="Password"><input className="input" required minLength="8" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="Minimum 8 characters" /></Field><button className="btn primary wide" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create workspace"}</button></form><button className="switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>{mode === "login" ? "Don't have a workspace? Create company" : "Already registered? Sign in"}</button><div className="auth-note"><ShieldCheck size={14} /> Company data is isolated by workspace and every request is authenticated.</div></div><div className="auth-art"><div className="art-card"><div className="art-label">LIVE INVENTORY</div><strong>Production control,<br />without the spreadsheet chaos.</strong><div className="art-stat"><span>Beam inventory</span><b>12,480.50 KG</b></div><div className="art-lines"><i /><i /><i /><i /></div></div></div></div>;
}

function Shell({ session: s, onLogout }) {
  const [mobile, setMobile] = useState(false), [refresh, setRefresh] = useState(0);
  const location = useLocation(), navigate = useNavigate();
  const nav = [["/dashboard", "Dashboard", LayoutDashboard], ["/stock", "Stock Entry", Package], ["/beams", "Beam Ready", Factory], ["/analytics", "Analytics", BarChart3], ["/masters", "Master Data", Database], ...(s.user.role !== "staff" ? [["/staff", "Staff & Roles", Users]] : [])];
  const current = nav.find(([path]) => location.pathname.startsWith(path));
  const detail = location.pathname.startsWith("/quality/");
  return <div className="app"><aside className={`sidebar ${mobile ? "open" : ""}`}><div className="sidebar-top"><div className="brand"><div className="brand-mark">YI</div><div className="brand-text"><b>Yarn Inventory</b><span>SaaS Workspace</span></div></div><button className="mobile-close" onClick={() => setMobile(false)}><X /></button></div><div className="workspace"><Building2 size={15} /><span>{s.company.name}</span><em>{s.company.code}</em></div><nav>{nav.map(([path, label, Icon]) => <Link key={path} to={path} className={location.pathname === path ? "active" : ""} onClick={() => setMobile(false)}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{s.user.name[0]}</div><div><b>{s.user.name}</b><span>{s.user.role}</span></div></div><button className="logout" onClick={onLogout}><LogOut size={15} /> Sign out</button></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobile(true)}><Menu /></button><div><div className="crumb">{s.company.name}</div><h1>{detail ? "Quality Inventory" : current?.[1] || "Dashboard"}</h1></div><button className="icon-btn" onClick={() => setRefresh((x) => x + 1)} title="Refresh">↻</button></header><Routes><Route path="/dashboard" element={<Dashboard onOpen={(id) => navigate("/quality/" + id)} refresh={refresh} />} /><Route path="/stock" element={<Stock refresh={refresh} />} /><Route path="/beams" element={<Beams refresh={refresh} />} /><Route path="/analytics" element={<Analytics />} /><Route path="/masters" element={<Masters refresh={refresh} />} /><Route path="/staff" element={<Staff />} /><Route path="/quality/:id" element={<QualityDetailRoute />} /><Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></main></div>;
}

function QualityDetailRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const id = pathname.split("/").pop();
  return <QualityDetail id={id} onBack={() => navigate(-1)} />;
}

createRoot(document.getElementById("root")).render(<App />);
