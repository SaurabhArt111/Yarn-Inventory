import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState } from './ui.jsx';

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="page-body">Loading…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function RequireGuest({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <div className="page-body">Loading…</div>;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <EmptyState
        title="You don't have access to this page"
        description="Ask an Owner or Admin on your team to grant this permission if you need it."
      />
    );
  }
  return children;
}
