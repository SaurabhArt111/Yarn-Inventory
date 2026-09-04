import React, { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, ChevronRight, Database, Factory, Package, Users } from "lucide-react";
import { api } from "../lib/api";
import { Empty, kg, Loading, num, PageError } from "../components/ui";

function Metric({ label, value, icon: Icon }) {
  return <div className="metric"><div className="metric-icon"><Icon size={17} /></div><span>{label}</span><strong>{value}</strong></div>;
}
export default function Dashboard({ onOpen, refresh }) {
  const [data, setData] = useState(null), [err, setErr] = useState("");
  useEffect(() => { Promise.all([api("/analytics/overview"), api("/analytics/quality")]).then(([o, q]) => setData({ o, q })).catch((e) => setErr(e.message)); }, [refresh]);
  if (err) return <PageError text={err} />;
  if (!data) return <Loading />;
  const c = data.o.counts;
  return <div className="content"><div className="welcome"><div><div className="eyebrow">OPERATIONS OVERVIEW</div><h2>Inventory at a glance</h2><p>Track yarn received, beam production and remaining stock across your workspace.</p></div><div className="formula-chip">Beam Weight = Ends × Meter × Denier ÷ 9,000,000</div></div><div className="metrics"><Metric label="Qualities" value={num(c.qualities)} icon={Database} /><Metric label="Parties" value={num(c.parties)} icon={Users} /><Metric label="Total Stock" value={kg(c.stockWeight)} icon={Package} /><Metric label="Beam Weight" value={kg(c.beamWeight)} icon={Factory} /><Metric label="Remaining Inventory" value={kg(data.q.reduce((a, x) => a + x.remainingWeight, 0))} icon={BarChart3} /><Metric label="Ready Beams" value={num(c.beamCount)} icon={CheckCircle2} /></div><section className="section"><div className="section-head"><div><h2>Product / Quality Inventory</h2><p>Click any quality for stock, shade, lot and beam-level traceability.</p></div></div>{data.q.length ? <div className="quality-grid">{data.q.map((x) => <button className="quality-card" key={x.id} onClick={() => onOpen(x.id)}><div className="qc-top"><span className="quality-icon">{x.name.slice(0, 1).toUpperCase()}</span><span className="status-dot" /></div><h3>{x.name}</h3><div className="qc-weight">{kg(x.remainingWeight)}</div><small>remaining inventory</small><div className="qc-row"><span>{x.beamCount} beams</span><span>{x.stockEntries} stock entries <ChevronRight size={14} /></span></div></button>)}</div> : <Empty title="No qualities yet" text="Add a Quality in Master Data, then create your first stock entry." />}</section></div>;
}
