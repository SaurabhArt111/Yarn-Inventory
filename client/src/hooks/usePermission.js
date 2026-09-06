import { useAuth } from '../context/AuthContext.jsx';

// Thin wrapper kept as its own hook so pages read intent clearly
// (`const canEdit = usePermission('stock.edit')`) even though the backend
// remains the real authorization boundary.
export function usePermission(...permissions) {
  const { can } = useAuth();
  return can(...permissions);
}
