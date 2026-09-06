import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qualityApi } from '../../api/masters.js';
import { importApi } from '../../api/import.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { useQueryParams } from '../../hooks/useQueryParams.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { Field, Input } from '../../components/Form.jsx';
import { Modal, Drawer, ConfirmDialog } from '../../components/Overlay.jsx';
import { Badge, EmptyState, ErrorState, Pagination, TableSkeleton } from '../../components/ui.jsx';
import { extractErrorMessage } from '../../api/client.js';

export default function Qualities() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, updateParams] = useQueryParams({ page: 1, limit: 20, search: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeQualityId, setActiveQualityId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canCreate = usePermission(PERMISSIONS.QUALITY_CREATE);
  const canEdit = usePermission(PERMISSIONS.QUALITY_EDIT);
  const canDelete = usePermission(PERMISSIONS.QUALITY_DELETE);
  const canImport = usePermission(PERMISSIONS.QUALITY_IMPORT);

  const listQ = useQuery({ queryKey: ['qualities', params], queryFn: () => qualityApi.list(params), keepPreviousData: true });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['qualities'] });

  const deleteMut = useMutation({
    mutationFn: (id) => qualityApi.remove(id),
    onSuccess: () => {
      toast.success('Quality deleted');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  const items = listQ.data?.items || [];

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Qualities</h1>
          <p>One master name per quality — shades are managed independently underneath it.</p>
        </div>
        <div className="row">
          {canImport && (
            <button className="btn btn-secondary" onClick={() => setImportOpen(true)}>
              Import
            </button>
          )}
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              + Add Quality
            </button>
          )}
        </div>
      </div>

      <div className="table-toolbar">
        <Input
          placeholder="Search qualities…"
          value={params.search}
          onChange={(e) => updateParams({ search: e.target.value })}
          style={{ maxWidth: 260 }}
        />
      </div>

      {listQ.isLoading && (
        <div className="table-scroll" style={{ padding: 16 }}>
          <TableSkeleton />
        </div>
      )}
      {listQ.isError && <ErrorState message={extractErrorMessage(listQ.error)} onRetry={listQ.refetch} />}
      {listQ.isSuccess && items.length === 0 && (
        <EmptyState title="No qualities yet" description="Add your first quality, or import a list from CSV/Excel." />
      )}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Shades</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q._id} onClick={() => setActiveQualityId(q._id)}>
                  <td>{q.name}</td>
                  <td className="num">{q.shades?.length || 0}</td>
                  <td>
                    <Badge tone={q.status === 'active' ? 'green' : 'neutral'}>{q.status}</Badge>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    {canDelete && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(q)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={listQ.data?.meta} onPageChange={(page) => updateParams({ page })} />

      <CreateQualityModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={invalidate} />
      <ImportQualityModal open={importOpen} onClose={() => setImportOpen(false)} onImported={invalidate} />
      {activeQualityId && (
        <ShadeDrawer qualityId={activeQualityId} canEdit={canEdit} onClose={() => setActiveQualityId(null)} onChanged={invalidate} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete quality?"
        description={`This will permanently delete "${deleteTarget?.name}" and all its shades. Blocked if stock entries already reference it.`}
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
      />
    </div>
  );
}

function CreateQualityModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [shadesText, setShadesText] = useState('');

  const createMut = useMutation({
    mutationFn: () =>
      qualityApi.create({
        name,
        shades: shadesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success('Quality created');
      onCreated();
      setName('');
      setShadesText('');
      onClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add quality"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="quality-form" type="submit" disabled={createMut.isPending}>
            Save
          </button>
        </>
      }
    >
      <form
        id="quality-form"
        onSubmit={(e) => {
          e.preventDefault();
          createMut.mutate();
        }}
      >
        <Field label="Quality name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="30D Polyester" required autoFocus />
        </Field>
        <Field label="Initial shades" hint="Comma-separated, e.g. 001, 002, 003 — you can add more later">
          <Input value={shadesText} onChange={(e) => setShadesText(e.target.value)} placeholder="001, 002, 003" />
        </Field>
      </form>
    </Modal>
  );
}

function ShadeDrawer({ qualityId, canEdit, onClose, onChanged }) {
  const toast = useToast();
  const detailQ = useQuery({ queryKey: ['quality-detail', qualityId], queryFn: () => qualityApi.detail(qualityId) });
  const [newShade, setNewShade] = useState('');

  const addMut = useMutation({
    mutationFn: () => qualityApi.addShade(qualityId, newShade),
    onSuccess: () => {
      toast.success('Shade added');
      setNewShade('');
      detailQ.refetch();
      onChanged();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ shadeId, status }) => qualityApi.updateShade(qualityId, shadeId, { status }),
    onSuccess: () => {
      detailQ.refetch();
      onChanged();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const quality = detailQ.data?.quality;
  const summary = detailQ.data?.summary;

  return (
    <Drawer open onClose={onClose} title={quality?.name || 'Quality'}>
      {detailQ.isLoading && <p className="muted">Loading…</p>}
      {summary && (
        <div className="stack" style={{ marginBottom: 18 }}>
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Remaining weight</div>
              <div className="kpi-value num">{summary.remainingKg} KG</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Remaining cones</div>
              <div className="kpi-value num">{summary.remainingCones}</div>
            </div>
          </div>
          <div className="row wrap" style={{ fontSize: 12.5 }}>
            <span className="muted">Received: <b className="num">{summary.totalReceivedKg} KG</b></span>
            <span className="muted">Consumed: <b className="num">{summary.totalConsumedKg} KG</b></span>
            <span className="muted">Beams: <b className="num">{summary.totalBeams}</b></span>
          </div>
        </div>
      )}

      <div className="section-title">Shades</div>
      <div className="stack">
        {quality?.shades?.map((shade) => (
          <div className="row spread" key={shade._id} style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '8px 12px' }}>
            <span>{shade.name}</span>
            <div className="row">
              <Badge tone={shade.status === 'active' ? 'green' : 'neutral'}>{shade.status}</Badge>
              {canEdit && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toggleMut.mutate({ shadeId: shade._id, status: shade.status === 'active' ? 'inactive' : 'active' })}
                >
                  {shade.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}
        {quality?.shades?.length === 0 && <p className="muted">No shades yet.</p>}
      </div>

      {canEdit && (
        <form
          className="row"
          style={{ marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (newShade.trim()) addMut.mutate();
          }}
        >
          <Input value={newShade} onChange={(e) => setNewShade(e.target.value)} placeholder="New shade name (e.g. 005)" />
          <button className="btn btn-secondary" type="submit" disabled={addMut.isPending}>
            Add
          </button>
        </form>
      )}
    </Drawer>
  );
}

function ImportQualityModal({ open, onClose, onImported }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | preview
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');

  const previewMut = useMutation({
    mutationFn: (file) => importApi.previewQuality(file),
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const confirmMut = useMutation({
    mutationFn: (names) => importApi.confirmQuality(names),
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} quality name(s), skipped ${result.skipped}`);
      onImported();
      reset();
      onClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function reset() {
    setStep('upload');
    setPreview(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    previewMut.mutate(file);
  }

  const validNames = preview?.rows.filter((r) => r.status === 'valid').map((r) => r.name) || [];

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import qualities"
      size="lg"
      footer={
        step === 'preview' ? (
          <>
            <button className="btn btn-secondary" onClick={reset}>
              Back
            </button>
            <button className="btn btn-primary" disabled={validNames.length === 0 || confirmMut.isPending} onClick={() => confirmMut.mutate(validNames)}>
              Import {validNames.length} row{validNames.length === 1 ? '' : 's'}
            </button>
          </>
        ) : null
      }
    >
      {step === 'upload' && (
        <div className="stack">
          <p className="muted">Upload a CSV or Excel file with a column of quality names (a header like "Quality Name" is optional).</p>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} />
          {previewMut.isPending && <p className="muted">Parsing {fileName}…</p>}
        </div>
      )}

      {step === 'preview' && preview && (
        <div>
          <div className="row wrap" style={{ marginBottom: 14 }}>
            <Badge tone="neutral">{preview.summary.totalRows} rows</Badge>
            <Badge tone="green">{preview.summary.validRows} will import</Badge>
            <Badge tone="amber">{preview.summary.duplicateRows} duplicates</Badge>
            <Badge tone="rust">{preview.summary.errorRows} errors</Badge>
          </div>
          <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="num">{r.row}</td>
                    <td>{r.name || <span className="faint">(empty)</span>}</td>
                    <td>
                      <Badge tone={r.status === 'valid' ? 'green' : r.status === 'duplicate' ? 'amber' : 'rust'}>{r.status}</Badge>
                    </td>
                    <td className="wrap">{r.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
