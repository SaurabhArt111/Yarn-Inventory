import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../api/reports.js';
import { qualityApi, partyApi, companyApi } from '../../api/masters.js';
import { usePermission } from '../../hooks/usePermission.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { Input, Select } from '../../components/Form.jsx';
import { Tabs, EmptyState, ErrorState, Skeleton } from '../../components/ui.jsx';
import { extractErrorMessage } from '../../api/client.js';

const REPORT_LABELS = {
  stock: 'Stock Entries',
  beams: 'Beam Production',
  inventory: 'Inventory Ledger',
  parties: 'Party Summary',
  companies: 'Company Summary',
  qualities: 'Quality Summary',
};

export default function Reports() {
  const [type, setType] = useState('stock');
  const [filters, setFilters] = useState({ from: '', to: '', quality: '', party: '', company: '', lotNo: '' });
  const canExport = usePermission(PERMISSIONS.REPORTS_EXPORT);

  const qualitiesQ = useQuery({ queryKey: ['qualities-select'], queryFn: () => qualityApi.listForSelect({}) });
  const partiesQ = useQuery({ queryKey: ['parties-select'], queryFn: () => partyApi.listForSelect({}) });
  const companiesQ = useQuery({ queryKey: ['companies-select'], queryFn: () => companyApi.listForSelect({}) });

  const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const reportQ = useQuery({
    queryKey: ['report', type, cleanFilters],
    queryFn: () => reportApi.fetchJson(type, cleanFilters),
  });

  const columns = reportQ.data?.rows?.[0] ? Object.keys(reportQ.data.rows[0]) : [];

  function set(key) {
    return (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Reports</h1>
          <p>Filter, preview, then export to CSV or Excel.</p>
        </div>
      </div>

      <Tabs tabs={Object.entries(REPORT_LABELS).map(([value, label]) => ({ value, label }))} active={type} onChange={setType} />

      <div className="table-toolbar">
        <div className="table-filters">
          <Input type="date" value={filters.from} onChange={set('from')} />
          <Input type="date" value={filters.to} onChange={set('to')} />
          {type !== 'qualities' && (
            <Select value={filters.quality} onChange={set('quality')}>
              <option value="">All qualities</option>
              {qualitiesQ.data?.items.map((q) => (
                <option key={q._id} value={q._id}>
                  {q.name}
                </option>
              ))}
            </Select>
          )}
          {type !== 'parties' && (
            <Select value={filters.party} onChange={set('party')}>
              <option value="">All parties</option>
              {partiesQ.data?.items.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
          {type !== 'companies' && (
            <Select value={filters.company} onChange={set('company')}>
              <option value="">All companies</option>
              {companiesQ.data?.items.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {(type === 'stock' || type === 'beams') && (
            <Input placeholder="Lot no." value={filters.lotNo} onChange={set('lotNo')} style={{ maxWidth: 120 }} />
          )}
        </div>
        {canExport && (
          <div className="row">
            <a className="btn btn-secondary btn-sm" href={reportApi.downloadUrl(type, cleanFilters, 'csv')} target="_blank" rel="noreferrer">
              Export CSV
            </a>
            <a className="btn btn-secondary btn-sm" href={reportApi.downloadUrl(type, cleanFilters, 'xlsx')} target="_blank" rel="noreferrer">
              Export Excel
            </a>
          </div>
        )}
      </div>

      {reportQ.isLoading && <Skeleton height={200} />}
      {reportQ.isError && <ErrorState message={extractErrorMessage(reportQ.error)} onRetry={reportQ.refetch} />}
      {reportQ.isSuccess && reportQ.data.rows.length === 0 && <EmptyState title="No rows match these filters" />}

      {reportQ.isSuccess && reportQ.data.rows.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportQ.data.rows.slice(0, 200).map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} className={typeof row[c] === 'number' ? 'num' : ''}>
                      {String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {reportQ.data.rows.length > 200 && (
            <p className="muted" style={{ padding: 10 }}>
              Showing first 200 of {reportQ.data.rows.length} rows — export for the full report.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
