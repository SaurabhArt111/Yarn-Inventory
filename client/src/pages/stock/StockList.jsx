import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../../api/stock.js';
import { qualityApi, partyApi, companyApi } from '../../api/masters.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { useQueryParams } from '../../hooks/useQueryParams.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { Field, Input, Select, Textarea, NumberInput } from '../../components/Form.jsx';
import { SearchableSelect } from '../../components/SearchableSelect.jsx';
import { Drawer } from '../../components/Overlay.jsx';
import { Badge, EmptyState, ErrorState, Pagination, TableSkeleton, fmtKg, fmtNum, fmtDate } from '../../components/ui.jsx';
import { extractErrorMessage, extractFieldErrors } from '../../api/client.js';

export default function StockList() {
  const [params, updateParams] = useQueryParams({ page: 1, limit: 20, search: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const canCreate = usePermission(PERMISSIONS.STOCK_CREATE);

  const qualitiesQ = useQuery({ queryKey: ['qualities-select'], queryFn: () => qualityApi.listForSelect({}) });
  const partiesQ = useQuery({ queryKey: ['parties-select'], queryFn: () => partyApi.listForSelect({}) });
  const companiesQ = useQuery({ queryKey: ['companies-select'], queryFn: () => companyApi.listForSelect({}) });

  const listQ = useQuery({ queryKey: ['stock-entries', params], queryFn: () => stockApi.list(params), keepPreviousData: true });
  const items = listQ.data?.items || [];

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Stock Entries</h1>
          <p>Every entry is the source of one or more beams — open a row to see full traceability.</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + New Stock Entry
          </button>
        )}
      </div>

      <div className="table-toolbar">
        <div className="table-filters">
          <Input placeholder="Search reference, challan, lot…" value={params.search} onChange={(e) => updateParams({ search: e.target.value })} />
          <Select value={params.quality || ''} onChange={(e) => updateParams({ quality: e.target.value || undefined })}>
            <option value="">All qualities</option>
            {qualitiesQ.data?.items.map((q) => (
              <option key={q._id} value={q._id}>
                {q.name}
              </option>
            ))}
          </Select>
          <Select value={params.party || ''} onChange={(e) => updateParams({ party: e.target.value || undefined })}>
            <option value="">All parties</option>
            {partiesQ.data?.items.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select value={params.company || ''} onChange={(e) => updateParams({ company: e.target.value || undefined })}>
            <option value="">All companies</option>
            {companiesQ.data?.items.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input type="date" value={params.from || ''} onChange={(e) => updateParams({ from: e.target.value || undefined })} />
          <Input type="date" value={params.to || ''} onChange={(e) => updateParams({ to: e.target.value || undefined })} />
        </div>
      </div>

      {listQ.isLoading && (
        <div className="table-scroll" style={{ padding: 16 }}>
          <TableSkeleton />
        </div>
      )}
      {listQ.isError && <ErrorState message={extractErrorMessage(listQ.error)} onRetry={listQ.refetch} />}
      {listQ.isSuccess && items.length === 0 && (
        <EmptyState title="No stock entries yet" description="Create your first stock entry to start tracking inventory." />
      )}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Quality</th>
                <th>Shade</th>
                <th>Lot</th>
                <th>Party</th>
                <th>Company</th>
                <th>Net Weight</th>
                <th>Remaining</th>
                <th>Cones (rem.)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s._id} onClick={() => setActiveId(s._id)}>
                  <td className="num">{s.reference}</td>
                  <td className="num">{fmtDate(s.date)}</td>
                  <td>{s.qualityName}</td>
                  <td>{s.shadeNo}</td>
                  <td>{s.lotNo}</td>
                  <td>{s.partyName}</td>
                  <td>{s.companyName}</td>
                  <td className="num">{fmtKg(s.netWeightKg)}</td>
                  <td className="num">{fmtKg(s.balance?.remaining)}</td>
                  <td className="num">{fmtNum(s.balance?.remainingCones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={listQ.data?.meta} onPageChange={(page) => updateParams({ page })} />

      <CreateStockDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      {activeId && <StockDetailDrawer id={activeId} onClose={() => setActiveId(null)} />}
    </div>
  );
}

function CreateStockDrawer({ open, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [selectedQuality, setSelectedQuality] = useState(null);

  function emptyForm() {
    return {
      date: new Date().toISOString().slice(0, 10),
      challanNo: '',
      quality: '',
      shadeId: '',
      party: '',
      partyLabel: '',
      company: '',
      companyLabel: '',
      box: '',
      totalCones: '',
      netWeightKg: '',
      lotNo: '',
      remarks: '',
    };
  }

  const createMut = useMutation({
    mutationFn: () =>
      stockApi.create({
        ...form,
        totalCones: Number(form.totalCones),
        netWeightKg: Number(form.netWeightKg),
      }),
    onSuccess: () => {
      toast.success('Stock entry created');
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-qualities'] });
      setForm(emptyForm());
      setSelectedQuality(null);
      onClose();
    },
    onError: (err) => {
      setErrors(extractFieldErrors(err) || {});
      toast.error(extractErrorMessage(err));
    },
  });

  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New stock entry"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="stock-form" type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Create'}
          </button>
        </>
      }
    >
      <form
        id="stock-form"
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
      >
        <div className="form-grid">
          <Field label="Date" error={errors.date?.[0]}>
            <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </Field>
          <Field label="Challan No." error={errors.challanNo?.[0]}>
            <Input value={form.challanNo} onChange={(e) => setForm((f) => ({ ...f, challanNo: e.target.value }))} required />
          </Field>

          <Field label="Quality" error={errors.quality?.[0]}>
            <SearchableSelect
              value={selectedQuality}
              loadOptions={(q) => qualityApi.listForSelect({ search: q }).then((r) => r.items)}
              getOptionLabel={(o) => o.name}
              onSelect={(q) => {
                setSelectedQuality(q);
                setForm((f) => ({ ...f, quality: q._id, shadeId: '' }));
              }}
              placeholder="Search quality…"
            />
          </Field>
          <Field label="Shade" error={errors.shadeId?.[0]}>
            <Select
              value={form.shadeId}
              onChange={(e) => setForm((f) => ({ ...f, shadeId: e.target.value }))}
              disabled={!selectedQuality}
              required
            >
              <option value="">{selectedQuality ? 'Select shade' : 'Select a quality first'}</option>
              {selectedQuality?.shades
                ?.filter((s) => s.status !== 'inactive')
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Party" error={errors.party?.[0]}>
            <SearchableSelect
              value={form.partyLabel ? { name: form.partyLabel } : null}
              loadOptions={(q) => partyApi.listForSelect({ search: q }).then((r) => r.items)}
              onSelect={(p) => setForm((f) => ({ ...f, party: p._id, partyLabel: p.name }))}
              placeholder="Search party…"
            />
          </Field>
          <Field label="Company" error={errors.company?.[0]}>
            <SearchableSelect
              value={form.companyLabel ? { name: form.companyLabel } : null}
              loadOptions={(q) => companyApi.listForSelect({ search: q }).then((r) => r.items)}
              onSelect={(c) => setForm((f) => ({ ...f, company: c._id, companyLabel: c.name }))}
              placeholder="Search company…"
            />
          </Field>

          <Field label="Lot No." error={errors.lotNo?.[0]}>
            <Input value={form.lotNo} onChange={(e) => setForm((f) => ({ ...f, lotNo: e.target.value }))} required />
          </Field>
          <Field label="Box" error={errors.box?.[0]} hint="Optional">
            <Input value={form.box} onChange={(e) => setForm((f) => ({ ...f, box: e.target.value }))} />
          </Field>

          <Field label="Total Cones" error={errors.totalCones?.[0]}>
            <NumberInput
              value={form.totalCones}
              onChange={(e) => setForm((f) => ({ ...f, totalCones: e.target.value }))}
              min="0"
              step="1"
              required
            />
          </Field>
          <Field label="Net Weight (KG)" error={errors.netWeightKg?.[0]}>
            <NumberInput
              value={form.netWeightKg}
              onChange={(e) => setForm((f) => ({ ...f, netWeightKg: e.target.value }))}
              min="0.001"
              step="0.001"
              required
            />
          </Field>

          <Field label="Remarks" className="span-2" hint="Optional">
            <Textarea value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </Field>
        </div>
      </form>
    </Drawer>
  );
}

function StockDetailDrawer({ id, onClose }) {
  const detailQ = useQuery({ queryKey: ['stock-detail', id], queryFn: () => stockApi.get(id) });
  const item = detailQ.data?.item;
  const beams = detailQ.data?.beams || [];

  return (
    <Drawer open onClose={onClose} title={item?.reference || 'Stock entry'}>
      {detailQ.isLoading && <p className="muted">Loading…</p>}
      {item && (
        <div className="stack">
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Original weight</div>
              <div className="kpi-value num">{fmtKg(item.balance.received)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Consumed</div>
              <div className="kpi-value num">{fmtKg(item.balance.consumed)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Remaining</div>
              <div className="kpi-value num">{fmtKg(item.balance.remaining)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Remaining cones</div>
              <div className="kpi-value num">{fmtNum(item.balance.remainingCones)}</div>
            </div>
          </div>

          <div className="divider" />
          <div className="form-grid" style={{ fontSize: 13 }}>
            <InfoRow label="Date" value={fmtDate(item.date)} />
            <InfoRow label="Challan No." value={item.challanNo} />
            <InfoRow label="Quality" value={item.qualityName} />
            <InfoRow label="Shade" value={item.shadeNo} />
            <InfoRow label="Lot" value={item.lotNo} />
            <InfoRow label="Box" value={item.box || '—'} />
            <InfoRow label="Party" value={item.partyName} />
            <InfoRow label="Company" value={item.companyName} />
            <InfoRow label="Total Cones" value={fmtNum(item.totalCones)} />
            <InfoRow label="Status" value={<Badge tone={item.status === 'active' ? 'green' : 'rust'}>{item.status}</Badge>} />
          </div>
          {item.remarks && (
            <>
              <div className="section-title">Remarks</div>
              <p className="muted">{item.remarks}</p>
            </>
          )}

          <div className="section-title">Beams produced from this stock ({beams.length})</div>
          {beams.length === 0 && <p className="muted">No beams produced yet.</p>}
          {beams.length > 0 && (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Beam No.</th>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Cones</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {beams.map((b) => (
                    <tr key={b._id}>
                      <td className="num">{b.reference}</td>
                      <td className="num">{fmtDate(b.productionDate)}</td>
                      <td className="num">{fmtKg(b.beamWeightKg)}</td>
                      <td className="num">{fmtNum(b.consumedCones)}</td>
                      <td>
                        <Badge tone={b.status === 'active' ? 'green' : 'rust'}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 2 }}>
        {label}
      </div>
      <div>{value}</div>
    </div>
  );
}
