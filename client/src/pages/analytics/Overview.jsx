import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '../../api/analytics.js';
import { Skeleton, fmtKg } from '../../components/ui.jsx';

export default function AnalyticsOverview() {
  const q = useQuery({ queryKey: ['analytics-overview'], queryFn: () => analyticsApi.overview({}) });
  const data = q.data;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>Analytics Overview</h1>
          <p>Stock, production and consumption trends across your whole workspace.</p>
        </div>
      </div>

      {q.isLoading && <Skeleton height={280} />}

      {data && (
        <div className="stack">
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Remaining inventory</div>
              <div className="kpi-value num">{fmtKg(data.remainingInventoryKg)}</div>
            </div>
          </div>

          <div className="panel">
            <h3>Stock received vs. production over time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" allowDuplicatedCategory={false} type="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line data={data.stockReceivedOverTime} dataKey="weightKg" name="Stock received (KG)" stroke="var(--color-amber-600)" dot={false} type="monotone" />
                <Line data={data.productionOverTime} dataKey="weightKg" name="Production (KG)" stroke="var(--color-green-600)" dot={false} type="monotone" />
                <Line data={data.consumptionOverTime} dataKey="weightKg" name="Consumption (KG)" stroke="var(--color-rust-600)" dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h3>Top qualities by received weight</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topQualities} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                <Tooltip />
                <Bar dataKey="receivedKg" name="Received (KG)" fill="var(--color-indigo-800)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
