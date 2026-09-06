// Small, frequently-reused presentational building blocks kept together
// to avoid a sprawl of one-line component files.

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state">
      <h3>Something went wrong</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="stack">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="row" key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} width={c === 0 ? 90 : 120} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <button className="btn btn-ghost btn-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
        Prev
      </button>
      <button className="btn btn-ghost btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>
        Next
      </button>
    </div>
  );
}

export function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="kpi-card" style={accent ? { '--accent': accent } : undefined}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value num">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.value} className={`tab-btn ${active === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function fmtKg(n) {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} KG`;
}

export function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
