import { useAuth } from '../../context/AuthContext.jsx';

export default function Settings() {
  const { tenant, user } = useAuth();

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Settings</h1>
          <p>Workspace profile and preferences.</p>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 520 }}>
        <h3>Workspace</h3>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Company name</label>
            <div>{tenant?.name}</div>
          </div>
          <div className="field">
            <label>Business type</label>
            <div>{tenant?.businessType || '—'}</div>
          </div>
          <div className="field">
            <label>Plan</label>
            <div>{tenant?.plan?.tier} ({tenant?.plan?.status})</div>
          </div>
          <div className="field">
            <label>Date format</label>
            <div>{tenant?.settings?.dateFormat}</div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 520, marginTop: 16 }}>
        <h3>Your account</h3>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Name</label>
            <div>{user?.name}</div>
          </div>
          <div className="field">
            <label>Email</label>
            <div>{user?.email}</div>
          </div>
          <div className="field">
            <label>Role</label>
            <div>{user?.role}</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Password changes and billing/subscription management are planned for a future update — the architecture (Tenant.plan) is already in place for it.
        </p>
      </div>
    </div>
  );
}
