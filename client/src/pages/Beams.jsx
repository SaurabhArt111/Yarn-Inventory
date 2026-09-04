import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import {
  DataTable,
  Field,
  FormError,
  kg,
  Modal,
  ModalActions,
  num,
  PageHead,
  Toolbar,
} from "../components/ui";

function BeamModal({ masters, stocks, onClose, onSaved }) {
  const [f, setF] = useState({
      beamNo: "",
      date: new Date().toISOString().slice(0, 10),
      challanNo: "",
      stockEntry: "",
      quality: "",
      party: "",
      ends: "",
      finalDenier: "",
      meter: "",
      width: "",
      pipes: "",
      remarks: "",
    }),
    [err, setErr] = useState(""),
    [available, setAvailable] = useState(null);
  const set = (k, v) => setF((previous) => ({ ...previous, [k]: v }));
  const weight = useMemo(() => {
    const e = Number(f.ends),
      m = Number(f.meter),
      d = Number(f.finalDenier);
    return e && m && d ? ((e * m * d) / 9000000).toFixed(3) : "0.000";
  }, [f.ends, f.meter, f.finalDenier]);
  useEffect(() => {
    if (!f.stockEntry) {
      setAvailable(null);
      return;
    }
    api("/beams/source/" + f.stockEntry)
      .then(setAvailable)
      .catch(() => setAvailable(null));
  }, [f.stockEntry]);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api("/beams", {
        method: "POST",
        body: JSON.stringify({
          ...f,
          beamWeight: Number(weight),
          ends: Number(f.ends),
          finalDenier: Number(f.finalDenier),
          meter: Number(f.meter),
          width: Number(f.width || 0),
          pipes: f.pipes,
        }),
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <Modal
      title="Ready New Beam"
      subtitle="Select the source stock and enter production readings. Beam weight is calculated live."
      onClose={onClose}
    >
      <FormError text={err} />
      <form onSubmit={save}>
        <div className="calc-preview">
          <div>
            <span>Calculated Beam Weight</span>
            <strong>{kg(weight)}</strong>
          </div>
          <div className="calc-eq">(Ends × Meter × Denier) ÷ 9,000,000</div>
        </div>
        <div className="formgrid">
          <Field label="Beam No.">
            <input
              required
              className="input"
              value={f.beamNo}
              onChange={(e) => set("beamNo", e.target.value)}
            />
          </Field>
          <Field label="Date">
            <input
              required
              className="input"
              type="date"
              value={f.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
          <Field label="Challan No.">
            <input
              required
              className="input"
              value={f.challanNo}
              onChange={(e) => set("challanNo", e.target.value)}
            />
          </Field>
          <Field label="Source Stock Entry">
            <select
              required
              className="select"
              value={f.stockEntry}
              onChange={(e) => {
                const value = e.target.value;
                const x = stocks.find((s) => s._id === value);
                setF((previous) => ({
                  ...previous,
                  stockEntry: value,
                  quality: x?.quality?._id || "",
                  party: x?.party?._id || "",
                }));
              }}
            >
              <option value="">Select stock entry</option>
              {stocks.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.challanNo} · {s.quality?.name} · Shade {s.shadeNo} ·{" "}
                  {kg(s.netWeight)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quality">
            <select
              required
              className="select"
              value={f.quality}
              onChange={(e) => set("quality", e.target.value)}
            >
              <option value="">Select quality</option>
              {masters.quality.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Party">
            <select
              required
              className="select"
              value={f.party}
              onChange={(e) => set("party", e.target.value)}
            >
              <option value="">Select party</option>
              {masters.party.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ends">
            <input
              required
              className="input"
              type="number"
              min="0"
              step="1"
              value={f.ends}
              onChange={(e) => set("ends", e.target.value)}
            />
          </Field>
          <Field label="Final Denier">
            <input
              required
              className="input"
              type="number"
              min="0"
              step="0.001"
              value={f.finalDenier}
              onChange={(e) => set("finalDenier", e.target.value)}
            />
          </Field>
          <Field label="Meter">
            <input
              required
              className="input"
              type="number"
              min="0"
              step="0.001"
              value={f.meter}
              onChange={(e) => set("meter", e.target.value)}
            />
          </Field>
          <Field label="Width">
            <input
              className="input"
              type="number"
              min="0"
              step="0.001"
              value={f.width}
              onChange={(e) => set("width", e.target.value)}
            />
          </Field>
          <Field label="Pipes">
            <input
              className="input"
              value={f.pipes}
              onChange={(e) => set("pipes", e.target.value)}
              placeholder="e.g. Standard / 3 inch / Custom"
            />
          </Field>
          <Field label="Remarks" full>
            <textarea
              className="textarea"
              rows="3"
              value={f.remarks}
              onChange={(e) => set("remarks", e.target.value)}
            />
          </Field>
        </div>
        {available && (
          <div className={"availability " + (Number(weight) > available.remainingWeight ? "bad" : "")}>
            <span>Available across stock entries for this quality</span>
            <b>{kg(available.remainingWeight)}</b>
          </div>
        )}
        <ModalActions onClose={onClose} label="Create Beam" />
      </form>
    </Modal>
  );
}
export default function Beams({ refresh }) {
  const [rows, setRows] = useState([]),
    [stocks, setStocks] = useState([]),
    [masters, setMasters] = useState({ quality: [], party: [] }),
    [open, setOpen] = useState(false),
    [q, setQ] = useState("");
  const load = () =>
    Promise.all([
      api("/beams"),
      api("/stock"),
      api("/masters/quality"),
      api("/masters/party"),
    ]).then(([b, s, qu, p]) => {
      setRows(b);
      setStocks(s);
      setMasters({ quality: qu, party: p });
    });
  useEffect(() => {
    load();
  }, [refresh]);
  const filtered = rows.filter((r) =>
    `${r.beamNo} ${r.quality?.name} ${r.party?.name} ${r.challanNo}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="content">
      <PageHead
        title="Beam Ready"
        desc="Convert yarn into ready beams with automatic weight calculation."
        action={
          <button className="btn primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> Ready New Beam
          </button>
        }
      />
      <div className="formula-card">
        <div>
          <span className="eyebrow">AUTOMATIC CALCULATION</span>
          <strong>(Ends × Meter × Final Denier) / 9,000,000</strong>
        </div>
        <span>
          Example: 20,000 × 2,400 × 30 = <b>160 KG</b>
        </span>
      </div>
      <Toolbar
        value={q}
        onChange={setQ}
        placeholder="Search beam, challan, quality…"
      />
      <DataTable
        headers={[
          "Beam No.",
          "Date",
          "Challan",
          "Quality",
          "Party",
          "Ends",
          "Denier",
          "Meter",
          "Beam Weight",
          "Width",
          "Pipes",
        ]}
        rows={filtered.map((r) => [
          <b>{r.beamNo}</b>,
          r.date && new Date(r.date).toLocaleDateString("en-IN"),
          r.challanNo,
          r.quality?.name,
          r.party?.name,
          num(r.ends),
          r.finalDenier,
          num(r.meter),
          <b>{kg(r.beamWeight)}</b>,
          r.width || "—",
          r.pipes || "—",
        ])}
        empty="No beams produced yet."
      />
      {open && (
        <BeamModal
          masters={masters}
          stocks={stocks}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
