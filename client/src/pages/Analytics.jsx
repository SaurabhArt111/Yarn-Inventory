import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DataTable, kg, num, PageHead } from "../components/ui";
export default function Analytics() {
  const [tab, setTab] = useState("party"), [rows, setRows] = useState([]);
  useEffect(() => { api("/analytics/" + tab).then(setRows); }, [tab]);
  return <div className="content"><PageHead title="Analytics" desc="Understand inventory, parties, companies and production performance." /><div className="analytics-tabs">{[["party", "Party Analysis"], ["company", "Company Analysis"], ["quality", "Quality Analysis"]].map(([x, label]) => <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>{label}</button>)}</div>{tab === "quality" ? <DataTable headers={["Quality", "Received", "Used in Beams", "Remaining", "Beams", "Stock Entries"]} rows={rows.map((x) => [<b>{x.name}</b>, kg(x.receivedWeight), kg(x.usedWeight), <b>{kg(x.remainingWeight)}</b>, num(x.beamCount), num(x.stockEntries)])} /> : <DataTable headers={["Name", "Stock Weight", "Stock Entries", "Beam Weight", "Beams"]} rows={rows.map((x) => [<b>{x.name}</b>, kg(x.stockWeight), num(x.stockEntries), kg(x.beamWeight), num(x.beamCount)])} />}</div>;
}
