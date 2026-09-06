import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { beamApi } from '../../api/beams.js';
import { qualityApi, partyApi, companyApi } from '../../api/masters.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { useQueryParams } from '../../hooks/useQueryParams.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { Input, Select, Textarea } from '../../components/Form.jsx';
import { Drawer, Modal } from '../../components/Overlay.jsx';
import { Badge, EmptyState, ErrorState, Pagination, TableSkeleton, fmtKg, fmtNum, fmtDate } from '../../components/ui.jsx';
import { extractErrorMessage } from '../../api/client.js';

export default function BeamInventory() {
  const [params, updateParams] = useQueryParams({ page: 1, limit: 20, search: '', sortBy: 'productionDate', sortDir: 'desc' });
  const [activeId, setActiveId] = useState(null);

  const qualitiesQ = useQuery({ queryKey: ['qualities-select'], queryFn: () => qualityApi.listForSelect({}) });
  const partiesQ = useQuery({ queryKey: ['parties-select'], queryFn: () => partyApi.listForSelect({}) });
  const companiesQ = useQuery({ queryKey: ['companies-select'], queryFn: () => companyApi.listForSelect({}) });
  const listQ = useQuery({ queryKey: ['beams', params], queryFn: () => beamApi.list(params), keepPreviousData: true });

  const items = listQ.data?.items || [];

  function toggleSort(col) {
    if (params.sortBy === col) updateParams({ sortDir: params.sortDir === 'asc' ? 'desc' : 'asc', page: params.page });
    else updateParams({ sortBy: col, sortDir: 'desc', page: params.page });
  }

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Beam Inventory</h1>
          <p>Every beam produced, with full source-stock traceability.</p>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="table-filters">
          <Input placeholder="Search beam no., lot, party…" value={params.search} onChange={(e) => updateParams({ search: e.target.value })} />
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
          <Input placeholder="Lot no." value={params.lotNo || ''} onChange={(e) => updateParams({ lotNo: e.target.value || undefined })} style={{ maxWidth: 120 }} />
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
      {listQ.isSuccess && items.length === 0 && <EmptyState title="No beams yet" description="Produce your first beam from Beam Production." />}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('productionDate')}>
                  Date {params.sortBy === 'productionDate' ? (params.sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Beam No.</th>
                <th>Quality</th>
                <th>Shade</th>
                <th>Lot</th>
                <th>Party</th>
                <th>Company</th>
                <th className="sortable" onClick={() => toggleSort('beamWeightKg')}>
                  Weight {params.sortBy === 'beamWeightKg' ? (params.sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Cones</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b._id} onClick={() => setActiveId(b._id)}>
                  <td className="num">{fmtDate(b.productionDate)}</td>
                  <td className="num">{b.reference}</td>
                  <td>{b.qualityName}</td>
                  <td>{b.shadeNo}</td>
                  <td>{b.lotNo}</td>
                  <td>{b.partyName}</td>
                  <td>{b.companyName}</td>
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

      <Pagination meta={listQ.data?.meta} onPageChange={(page) => updateParams({ page })} />

      {activeId && <BeamDetailDrawer id={activeId} onClose={() => setActiveId(null)} />}
    </div>
  );
}

function BeamDetailDrawer({ id, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const canCancel = usePermission(PERMISSIONS.BEAM_DELETE);
  const detailQ = useQuery({ queryKey: ['beam-detail', id], queryFn: () => beamApi.get(id) });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancelMut = useMutation({
    mutationFn: () => beamApi.cancel(id, reason),
    onSuccess: () => {
      toast.success('Beam cancelled and inventory reversed');
      queryClient.invalidateQueries({ queryKey: ['beams'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-qualities'] });
      setCancelOpen(false);
      onClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const beam = detailQ.data?.item;
  const t = detailQ.data?.traceability;

  return (
    <Drawer open onClose={onClose} title={beam?.reference || 'Beam'}>
      {detailQ.isLoading && <p className="muted">Loading…</p>}
      {beam && (
        <div className="stack">
          <div className="row spread">
            <Badge tone={beam.status === 'active' ? 'green' : 'rust'}>{beam.status}</Badge>
            {canCancel && beam.status === 'active' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setCancelOpen(true)}>
                Cancel beam
              </button>
            )}
          </div>

          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Beam weight</div>
              <div className="kpi-value num">{fmtKg(beam.beamWeightKg)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Cones used</div>
              <div className="kpi-value num">{fmtNum(beam.consumedCones)}</div>
            </div>
          </div>

          <div className="form-grid" style={{ fontSize: 13 }}>
            <InfoRow label="Production date" value={fmtDate(beam.productionDate)} />
            <InfoRow label="Challan No." value={beam.challanNo || '—'} />
            <InfoRow label="Quality" value={beam.qualityName} />
            <InfoRow label="Shade" value={beam.shadeNo} />
            <InfoRow label="Lot" value={beam.lotNo} />
            <InfoRow label="Party" value={beam.partyName} />
            <InfoRow label="Company" value={beam.companyName} />
            <InfoRow label="Width" value={beam.width || '—'} />
            <InfoRow label="Pipes" value={beam.pipes || '—'} />
            <InfoRow label="Ends" value={fmtNum(beam.ends)} />
            <InfoRow label="Meter" value={fmtNum(beam.meter)} />
            <InfoRow label="Final Denier" value={fmtNum(beam.finalDenier)} />
          </div>

          {beam.remarks && (
            <>
              <div className="section-title">Remarks</div>
              <p className="muted">{beam.remarks}</p>
            </>
          )}

          <div className="section-title">Source stock traceability</div>
          {t?.sourceStockEntry ? (
            <div className="form-grid" style={{ fontSize: 13 }}>
              <InfoRow label="Source stock reference" value={t.sourceStockEntry.reference} />
              <InfoRow label="Original weight" value={fmtKg(t.sourceStockOriginalWeightKg)} />
              <InfoRow label="Original cones" value={fmtNum(t.sourceStockOriginalCones)} />
              <InfoRow label="Consumed before this beam" value={fmtKg(t.sourceStockConsumedBeforeThisBeamKg)} />
              <InfoRow label="Remaining after this beam" value={fmtKg(t.sourceStockRemainingAfterThisBeamKg)} />
              <InfoRow label="Current remaining (stock)" value={fmtKg(t.sourceStockCurrentRemainingKg)} />
              <InfoRow label="Current remaining cones" value={fmtNum(t.sourceStockCurrentRemainingCones)} />
            </div>
          ) : (
            <p className="muted">Source stock entry not found.</p>
          )}
        </div>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this beam?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancelOpen(false)}>
              Back
            </button>
            <button className="btn btn-danger" disabled={!reason.trim() || cancelMut.isPending} onClick={() => cancelMut.mutate()}>
              Cancel beam
            </button>
          </>
        }
      >
        <p className="muted">
          This reverses the weight and cones consumed back onto the source stock entry. The beam record is kept with a "cancelled" status
          for history — nothing is deleted.
        </p>
        <Textarea placeholder="Reason for cancellation" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
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
