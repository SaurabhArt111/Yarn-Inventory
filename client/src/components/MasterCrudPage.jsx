import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext.jsx';
import { usePermission } from '../hooks/usePermission.js';
import { useQueryParams } from '../hooks/useQueryParams.js';
import { Field, Input } from './Form.jsx';
import { Modal, ConfirmDialog } from './Overlay.jsx';
import { Badge, EmptyState, ErrorState, Pagination, TableSkeleton, fmtDate } from './ui.jsx';
import { extractErrorMessage } from '../api/client.js';

export function MasterCrudPage({ title, description, api, entityLabel, permissions, queryKeyBase }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, updateParams] = useQueryParams({ page: 1, limit: 20, search: '' });
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', item }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [name, setName] = useState('');

  const canCreate = usePermission(permissions.create);
  const canEdit = usePermission(permissions.edit);
  const canDelete = usePermission(permissions.delete);

  const listQ = useQuery({
    queryKey: [queryKeyBase, params],
    queryFn: () => api.list(params),
    keepPreviousData: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKeyBase] });

  const createMut = useMutation({
    mutationFn: (payload) => api.create(payload),
    onSuccess: () => {
      toast.success(`${entityLabel} created`);
      invalidate();
      closeModal();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => {
      toast.success(`${entityLabel} updated`);
      invalidate();
      closeModal();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      toast.success(`${entityLabel} deleted`);
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setName('');
    setModal({ mode: 'create' });
  }
  function openEdit(item) {
    setName(item.name);
    setModal({ mode: 'edit', item });
  }
  function closeModal() {
    setModal(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (modal.mode === 'create') createMut.mutate({ name });
    else updateMut.mutate({ id: modal.item._id, payload: { name } });
  }

  function toggleStatus(item) {
    updateMut.mutate({ id: item._id, payload: { status: item.status === 'active' ? 'inactive' : 'active' } });
  }

  const items = listQ.data?.items || [];

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add {entityLabel}
          </button>
        )}
      </div>

      <div className="table-toolbar">
        <Input
          placeholder={`Search ${entityLabel.toLowerCase()}s…`}
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
        <EmptyState
          title={`No ${entityLabel.toLowerCase()}s yet`}
          description={`Add your first ${entityLabel.toLowerCase()} to use it in stock entries.`}
        />
      )}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>
                    <Badge tone={item.status === 'active' ? 'green' : 'neutral'}>{item.status}</Badge>
                  </td>
                  <td className="num">{fmtDate(item.createdAt)}</td>
                  <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                    {canEdit && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(item)}>
                          {item.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(item)}>
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

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.mode === 'create' ? `Add ${entityLabel}` : `Edit ${entityLabel}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn btn-primary" form="master-form" type="submit" disabled={createMut.isPending || updateMut.isPending}>
              Save
            </button>
          </>
        }
      >
        <form id="master-form" onSubmit={handleSubmit}>
          <Field label={`${entityLabel} name`}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${entityLabel}?`}
        description={`This will permanently delete "${deleteTarget?.name}". This can't be undone. If it's referenced by existing records, deletion will be blocked — deactivate it instead.`}
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget._id)}
      />
    </div>
  );
}
