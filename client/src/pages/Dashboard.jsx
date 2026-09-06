import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.js';
import { KpiCard, Skeleton, EmptyState, fmtKg, fmtNum } from '../components/ui.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const summaryQ = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary });
  const qualitiesQ = useQuery({ queryKey: ['dashboard-qualities'], queryFn: dashboardApi.qualities });

  const kpis = summaryQ.data?.kpis;

  return (
    <div>
      <div className="panel-header">
        <h1>Dashboard</h1>
      </div>

      {summaryQ.isLoading && (
        <div className="kpi-row">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="kpi-card" key={i}>
              <Skeleton width={80} height={11} style={{ marginBottom: 10 }} />
              <Skeleton width={100} height={22} />
            </div>
          ))}
        </div>
      )}

      {kpis && (
        <div className="kpi-row">
          <KpiCard label="Total Qualities" value={fmtNum(kpis.totalQualities)} accent="var(--color-indigo-800)" />
          <KpiCard label="Total Parties" value={fmtNum(kpis.totalParties)} accent="var(--color-indigo-800)" />
          <KpiCard label="Operational Companies" value={fmtNum(kpis.totalCompanies)} accent="var(--color-indigo-800)" />
          <KpiCard label="Total Stock Received" value={fmtKg(kpis.totalStockWeightKg)} accent="var(--color-amber-600)" />
          <KpiCard label="Total Consumed" value={fmtKg(kpis.totalConsumedWeightKg)} accent="var(--color-rust-600)" />
          <KpiCard label="Remaining Inventory" value={fmtKg(kpis.remainingInventoryKg)} accent="var(--color-green-600)" />
          <KpiCard label="Total Beams" value={fmtNum(kpis.totalBeams)} accent="var(--color-indigo-800)" />
          <KpiCard
            label="Today's Stock"
            value={fmtKg(kpis.todaysStock?.weightKg)}
            sub={`${kpis.todaysStock?.count || 0} entries`}
            accent="var(--color-amber-600)"
          />
          <KpiCard
            label="Today's Production"
            value={fmtKg(kpis.todaysProduction?.weightKg)}
            sub={`${kpis.todaysProduction?.count || 0} beams`}
            accent="var(--color-green-600)"
          />
        </div>
      )}

      <div className="panel-header">
        <h2>Qualities</h2>
        <p>Click a quality to see its full stock and production breakdown.</p>
      </div>

      {qualitiesQ.isLoading && (
        <div className="quality-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="quality-card" key={i}>
              <Skeleton width={110} height={14} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="100%" height={12} style={{ marginBottom: 6 }} />
              <Skeleton width="100%" height={12} />
            </div>
          ))}
        </div>
      )}

      {qualitiesQ.data && qualitiesQ.data.items.length === 0 && (
        <EmptyState
          title="No qualities yet"
          description="Add your first quality under Masters → Qualities to start recording stock and production."
        />
      )}

      {qualitiesQ.data && qualitiesQ.data.items.length > 0 && (
        <div className="quality-grid">
          {qualitiesQ.data.items.map((q) => (
            <div className="quality-card" key={q.id} onClick={() => navigate(`/analytics/quality?id=${q.id}`)}>
              <h4>{q.name}</h4>
              <div className="qc-row">
                <span>Received</span>
                <span className="num">{fmtKg(q.totalReceivedKg)}</span>
              </div>
              <div className="qc-row">
                <span>Consumed</span>
                <span className="num">{fmtKg(q.consumedKg)}</span>
              </div>
              <div className="qc-row remaining">
                <span>Remaining weight</span>
                <span className="num">{fmtKg(q.remainingKg)}</span>
              </div>
              <div className="qc-row remaining">
                <span>Remaining cones</span>
                <span className="num">{fmtNum(q.remainingCones)}</span>
              </div>
              <div className="qc-row">
                <span>Shades / Beams</span>
                <span className="num">
                  {q.shadeCount} / {q.beamCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
