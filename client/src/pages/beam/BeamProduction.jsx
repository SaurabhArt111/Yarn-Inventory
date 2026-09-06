import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { beamApi } from '../../api/beams.js';
import { stockApi } from '../../api/stock.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Field, Input, Textarea, NumberInput } from '../../components/Form.jsx';
import { SearchableSelect } from '../../components/SearchableSelect.jsx';
import { fmtKg, fmtNum } from '../../components/ui.jsx';
import { extractErrorMessage, extractFieldErrors } from '../../api/client.js';

// Mirrors server/src/utils/inventoryMath.js exactly, for instant on-type
// feedback. This value is DISPLAY ONLY -- the backend independently
// recalculates and is the only value ever persisted.
function calcBeamWeight(ends, meter, finalDenier) {
  const e = Number(ends);
  const m = Number(meter);
  const d = Number(finalDenier);
  if (!(e > 0) || !(m > 0) || !(d > 0)) return null;
  return Math.round(((e * m * d) / 9_000_000 + Number.EPSILON) * 1000) / 1000;
}

function emptyForm() {
  return {
    productionDate: new Date().toISOString().slice(0, 10),
    challanNo: '',
    lotNo: '',
    ends: '',
    meter: '',
    finalDenier: '',
    consumedCones: '',
    width: '',
    pipes: '',
    remarks: '',
  };
}

export default function BeamProduction() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [stock, setStock] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [lastResult, setLastResult] = useState(null);

  const calculatedWeight = useMemo(() => calcBeamWeight(form.ends, form.meter, form.finalDenier), [form.ends, form.meter, form.finalDenier]);

  const weightExceeds = stock && calculatedWeight !== null && calculatedWeight > stock.balance.remaining + 0.001;
  const conesExceeds = stock && form.consumedCones !== '' && Number(form.consumedCones) > stock.balance.remainingCones;

  const createMut = useMutation({
    mutationFn: () =>
      beamApi.create({
        sourceStockEntry: stock._id,
        productionDate: form.productionDate,
        challanNo: form.challanNo,
        lotNo: form.lotNo,
        ends: Number(form.ends),
        meter: Number(form.meter),
        finalDenier: Number(form.finalDenier),
        consumedCones: Number(form.consumedCones),
        width: form.width,
        pipes: form.pipes,
        remarks: form.remarks,
      }),
    onSuccess: (data) => {
      toast.success(`Beam ${data.item.reference} created — ${data.item.beamWeightKg} KG`);
      setLastResult(data);
      setForm((f) => ({ ...emptyForm(), lotNo: f.lotNo, challanNo: f.challanNo }));
      queryClient.invalidateQueries({ queryKey: ['beams'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-qualities'] });
      // Refresh the selected stock's balance so the operator sees the real
      // remaining amount (server-authoritative) immediately.
      stockApi.get(stock._id).then((d) => setStock({ ...d.item }));
    },
    onError: (err) => {
      setErrors(extractFieldErrors(err) || {});
      toast.error(extractErrorMessage(err));
    },
  });

  function handleSelectStock(s) {
    setStock(s);
    setForm((f) => ({ ...f, challanNo: s.challanNo, lotNo: s.lotNo }));
    setLastResult(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!stock) {
      toast.error('Select a source stock entry first');
      return;
    }
    createMut.mutate();
  }

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Beam Production</h1>
          <p>Beam weight = (Ends × Meter × Final Denier) ÷ 9,000,000. The backend recalculates this on save.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 720 }}>
        <Field label="Source stock entry">
          <SearchableSelect
            value={stock ? { name: `${stock.reference} — ${stock.qualityName} / ${stock.shadeNo}` } : null}
            loadOptions={(q) => stockApi.available({ search: q }).then((r) => r.items)}
            getOptionLabel={(o) => `${o.reference} — ${o.qualityName} / ${o.shadeNo} (Lot ${o.lotNo})`}
            getOptionMeta={(o) => `${fmtKg(o.balance?.remaining)} · ${fmtNum(o.balance?.remainingCones)} cones`}
            onSelect={handleSelectStock}
            placeholder="Search by reference, quality, or lot…"
            emptyText="No stock with remaining inventory found"
          />
        </Field>

        {stock && (
          <div className="row wrap" style={{ marginBottom: 16, fontSize: 12.5 }}>
            <span className="muted">Party: <b>{stock.partyName}</b></span>
            <span className="muted">Company: <b>{stock.companyName}</b></span>
            <span className="muted">Remaining: <b className="num">{fmtKg(stock.balance.remaining)}</b></span>
            <span className="muted">Remaining cones: <b className="num">{fmtNum(stock.balance.remainingCones)}</b></span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Production date" error={errors.productionDate?.[0]}>
              <Input type="date" value={form.productionDate} onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))} required />
            </Field>
            <Field label="Challan No." error={errors.challanNo?.[0]}>
              <Input value={form.challanNo} onChange={(e) => setForm((f) => ({ ...f, challanNo: e.target.value }))} />
            </Field>
            <Field label="Lot No." error={errors.lotNo?.[0]}>
              <Input value={form.lotNo} onChange={(e) => setForm((f) => ({ ...f, lotNo: e.target.value }))} required />
            </Field>
            <Field label="Width" error={errors.width?.[0]} hint="Optional">
              <Input value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} placeholder="1520mm" />
            </Field>

            <Field label="Ends" error={errors.ends?.[0]}>
              <NumberInput value={form.ends} onChange={(e) => setForm((f) => ({ ...f, ends: e.target.value }))} min="1" step="1" required />
            </Field>
            <Field label="Meter" error={errors.meter?.[0]}>
              <NumberInput value={form.meter} onChange={(e) => setForm((f) => ({ ...f, meter: e.target.value }))} min="0.01" step="0.01" required />
            </Field>
            <Field label="Final Denier" error={errors.finalDenier?.[0]}>
              <NumberInput value={form.finalDenier} onChange={(e) => setForm((f) => ({ ...f, finalDenier: e.target.value }))} min="0.01" step="0.01" required />
            </Field>
            <Field label="Cones used" error={errors.consumedCones?.[0]} hint={conesExceeds ? undefined : 'Cones consumed from the source stock'}>
              <NumberInput value={form.consumedCones} onChange={(e) => setForm((f) => ({ ...f, consumedCones: e.target.value }))} min="1" step="1" required error={conesExceeds} />
              {conesExceeds && <div className="error-text">Exceeds remaining cones ({fmtNum(stock.balance.remainingCones)} available)</div>}
            </Field>

            <Field label="Pipes" error={errors.pipes?.[0]} hint='Free text, e.g. "4 Pipes" or "P1,P2,P3"' className="span-2">
              <Input value={form.pipes} onChange={(e) => setForm((f) => ({ ...f, pipes: e.target.value }))} placeholder="4 Pipes" />
            </Field>
            <Field label="Remarks" hint="Optional" className="span-2">
              <Textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
            </Field>
          </div>

          <div className="calc-readout">
            <span className="label">Calculated Beam Weight</span>
            <span className="value">{calculatedWeight !== null ? `${calculatedWeight.toFixed(2)} KG` : '—'}</span>
          </div>
          {weightExceeds && (
            <p className="error-text" style={{ marginTop: -10, marginBottom: 14 }}>
              This exceeds the {fmtKg(stock.balance.remaining)} remaining on {stock.reference}.
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={!stock || createMut.isPending}>
            {createMut.isPending ? 'Creating beam…' : 'Create beam'}
          </button>
        </form>
      </div>

      {lastResult && (
        <div className="panel" style={{ maxWidth: 720, marginTop: 16 }}>
          <h3>Last beam created</h3>
          <div className="row wrap" style={{ fontSize: 13 }}>
            <span>
              <b className="num">{lastResult.item.reference}</b>
            </span>
            <span className="muted">
              Weight: <b className="num">{fmtKg(lastResult.item.beamWeightKg)}</b>
            </span>
            <span className="muted">
              Cones used: <b className="num">{fmtNum(lastResult.item.consumedCones)}</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
