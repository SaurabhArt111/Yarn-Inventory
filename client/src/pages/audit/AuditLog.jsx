import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../api/audit.js';
import { useQueryParams } from '../../hooks/useQueryParams.js';
import { Input } from '../../components/Form.jsx';
import { EmptyState, ErrorState, Pagination, TableSkeleton } from '../../components/ui.jsx';
import { extractErrorMessage } from '../../api/client.js';

export default function AuditLog() {
  const [params, updateParams] = useQueryParams({ page: 1, limit: 50, action: '' });
  const listQ = useQuery({ queryKey: ['audit-logs', params], queryFn: () => auditApi.list(params), keepPreviousData: true });
  const items = listQ.data?.items || [];

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Audit Log</h1>
          <p>Every important change in this workspace, with who did it and when.</p>
        </div>
      </div>

      <div className="table-toolbar">
        <Input placeholder="Filter by action (e.g. beam.created)…" value={params.action} onChange={(e) => updateParams({ action: e.target.value })} style={{ maxWidth: 280 }} />
      </div>

      {listQ.isLoading && (
        <div className="table-scroll" style={{ padding: 16 }}>
          <TableSkeleton />
        </div>
      )}
      {listQ.isError && <ErrorState message={extractErrorMessage(listQ.error)} onRetry={listQ.refetch} />}
      {listQ.isSuccess && items.length === 0 && <EmptyState title="No audit entries yet" />}

      {listQ.isSuccess && items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log._id}>
                  <td className="num">{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.userName}</td>
                  <td className="num">{log.action}</td>
                  <td>{log.entityType}</td>
                  <td className="wrap faint">{JSON.stringify(log.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={listQ.data?.meta} onPageChange={(page) => updateParams({ page })} />
    </div>
  );
}
