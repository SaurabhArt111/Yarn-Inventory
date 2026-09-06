import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../../api/staff.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { Field, Input, Select } from '../../components/Form.jsx';
import { Modal, Drawer } from '../../components/Overlay.jsx';
import { Badge, EmptyState, ErrorState, Skeleton, fmtDate } from '../../components/ui.jsx';
import { extractErrorMessage, extractFieldErrors } from '../../api/client.js';

const PERMISSION_GROUPS = [
  { label: 'Dashboard', perms: [PERMISSIONS.DASHBOARD_VIEW] },
  { label: 'Stock', perms: [PERMISSIONS.STOCK_VIEW, PERMISSIONS.STOCK_CREATE, PERMISSIONS.STOCK_EDIT, PERMISSIONS.STOCK_DELETE] },
  { label: 'Beams', perms: [PERMISSIONS.BEAM_VIEW, PERMISSIONS.BEAM_CREATE, PERMISSIONS.BEAM_EDIT, PERMISSIONS.BEAM_DELETE] },
  { label: 'Quality', perms: [PERMISSIONS.QUALITY_VIEW, PERMISSIONS.QUALITY_CREATE, PERMISSIONS.QUALITY_EDIT, PERMISSIONS.QUALITY_DELETE, PERMISSIONS.QUALITY_IMPORT] },
  { label: 'Party', perms: [PERMISSIONS.PARTY_VIEW, PERMISSIONS.PARTY_CREATE, PERMISSIONS.PARTY_EDIT, PERMISSIONS.PARTY_DELETE] },
  { label: 'Company', perms: [PERMISSIONS.COMPANY_VIEW, PERMISSIONS.COMPANY_CREATE, PERMISSIONS.COMPANY_EDIT, PERMISSIONS.COMPANY_DELETE] },
  { label: 'Reports', perms: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXPORT] },
  { label: 'Analytics', perms: [PERMISSIONS.ANALYTICS_VIEW] },
  { label: 'Staff & Audit', perms: [PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_MANAGE, PERMISSIONS.AUDIT_VIEW] },
  { label: 'Settings', perms: [PERMISSIONS.SETTINGS_MANAGE] },
];

export default function Staff() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const listQ = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => staffApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      invalidate();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const items = listQ.data?.items || [];

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Staff</h1>
          <p>Manage who can access this workspace and what they can do.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            + Invite staff
          </button>
        )}
      </div>

      {listQ.isLoading && <Skeleton height={160} />}
      {listQ.isError && <ErrorState message={extractErrorMessage(listQ.error)} onRetry={listQ.refetch} />}
      {listQ.isSuccess && items.length === 0 && <EmptyState title="No staff yet" />}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <Badge tone="indigo">{u.role}</Badge>
                  </td>
                  <td>
                    <Badge tone={u.status === 'active' ? 'green' : 'rust'}>{u.status}</Badge>
                  </td>
                  <td className="num">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                  <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                    {canManage && u.role !== 'owner' && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditTarget(u)}>
                          Permissions
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => statusMut.mutate({ id: u.id, status: u.status === 'active' ? 'disabled' : 'active' })}
                        >
                          {u.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={invalidate} />
      {editTarget && <PermissionsDrawer user={editTarget} onClose={() => setEditTarget(null)} onSaved={invalidate} />}
    </div>
  );
}

function InviteModal({ open, onClose, onInvited }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', password: '' });
  const [errors, setErrors] = useState({});

  const mut = useMutation({
    mutationFn: () => staffApi.invite(form),
    onSuccess: () => {
      toast.success('Staff member added');
      onInvited();
      setForm({ name: '', email: '', role: 'staff', password: '' });
      onClose();
    },
    onError: (err) => {
      setErrors(extractFieldErrors(err) || {});
      toast.error(extractErrorMessage(err));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite staff"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="invite-form" type="submit" disabled={mut.isPending}>
            Add
          </button>
        </>
      }
    >
      <form
        id="invite-form"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <Field label="Name" error={errors.name?.[0]}>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </Field>
        <Field label="Email" error={errors.email?.[0]}>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        </Field>
        <Field label="Role" error={errors.role?.[0]}>
          <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label="Temporary password" error={errors.password?.[0]} hint="At least 8 characters, with letters and numbers">
          <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} />
        </Field>
      </form>
    </Modal>
  );
}

function PermissionsDrawer({ user, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState(user.permissions);

  const mut = useMutation({
    mutationFn: () => staffApi.updatePermissions(user.id, { role, permissions }),
    onSuccess: () => {
      toast.success('Permissions updated');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function toggle(perm) {
    setPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Permissions — ${user.name}`}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={mut.isPending} onClick={() => mut.mutate()}>
            Save
          </button>
        </>
      }
    >
      <Field label="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <div className="section-title">Permissions</div>
      <div className="stack">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label}>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>{group.label}</div>
            <div className="chip-row">
              {group.perms.map((perm) => (
                <label
                  key={perm}
                  className="badge"
                  style={{
                    cursor: 'pointer',
                    background: permissions.includes(perm) ? 'var(--color-green-100)' : 'var(--color-surface-sunken)',
                    color: permissions.includes(perm) ? 'var(--color-green-700)' : 'var(--color-ink-muted)',
                  }}
                >
                  <input type="checkbox" checked={permissions.includes(perm)} onChange={() => toggle(perm)} style={{ marginRight: 5 }} />
                  {perm.split('.')[1]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
