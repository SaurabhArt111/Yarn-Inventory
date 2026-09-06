import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SearchableSelect } from '../../components/SearchableSelect.jsx';
import { Tabs, EmptyState, Skeleton, fmtKg, fmtNum, fmtDate } from '../../components/ui.jsx';

export function DimensionAnalysisPage({ title, description, loadOptions, analyze }) {
  const [searchParams] = useSearchParams();
  const [entity, setEntity] = useState(null);
  const [tab, setTab] = useState('stock');

  // Deep-link support: Dashboard quality cards link here with ?id=... --
  // once options load we resolve the id to a labeled entity.
  const presetId = searchParams.get('id');

  useEffect(() => {
    if (presetId && !entity) {
      loadOptions('').then((items) => {
        const found = items.find((i) => i._id === presetId);
        if (found) setEntity(found);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const analysisQ = useQuery({
    queryKey: ['dimension-analysis', title, entity?._id],
    queryFn: () => analyze(entity._id),
    enabled: !!entity,
  });

  const data = analysisQ.data;

  return (
    <div>
      <div className="panel-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18, maxWidth: 420 }}>
        <SearchableSelect
          value={entity}
          loadOptions={loadOptions}
          onSelect={setEntity}
          placeholder={`Search ${title.toLowerCase()}…`}
        />
      </div>

      {!entity && <EmptyState title="Select an entity above" description="Pick one to see its full stock and production breakdown." />}

      {entity && analysisQ.isLoading && <Skeleton height={200} />}

      {entity && data && (
        <div className="stack">
          <div className="kpi-row" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Total stock</div>
              <div className="kpi-value num">{fmtKg(data.summary.totalStockKg)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Consumed</div>
              <div className="kpi-value num">{fmtKg(data.summary.consumedKg)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Remaining</div>
              <div className="kpi-value num">{fmtKg(data.summary.remainingKg)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total beams</div>
              <div className="kpi-value num">{fmtNum(data.summary.totalBeams)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Shades</div>
              <div className="kpi-value num">{fmtNum(data.summary.shadeCount)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Parties / Companies</div>
              <div className="kpi-value num">
                {fmtNum(data.summary.partyCount)} / {fmtNum(data.summary.companyCount)}
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Production trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.dateTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weightKg" name="Production (KG)" stroke="var(--color-amber-600)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <Tabs
              tabs={[
                { value: 'stock', label: `Stock history (${data.stockHistory.length})` },
                { value: 'production', label: `Production history (${data.productionHistory.length})` },
              ]}
              active={tab}
              onChange={setTab}
            />
            {tab === 'stock' && (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Date</th>
                      <th>Quality</th>
                      <th>Shade</th>
                      <th>Lot</th>
                      <th>Net Weight</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockHistory.map((s) => (
                      <tr key={s._id}>
                        <td className="num">{s.reference}</td>
                        <td className="num">{fmtDate(s.date)}</td>
                        <td>{s.qualityName}</td>
                        <td>{s.shadeNo}</td>
                        <td>{s.lotNo}</td>
                        <td className="num">{fmtKg(s.netWeightKg)}</td>
                        <td className="num">{fmtKg(s.balance?.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'production' && (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Beam No.</th>
                      <th>Date</th>
                      <th>Quality</th>
                      <th>Shade</th>
                      <th>Lot</th>
                      <th>Weight</th>
                      <th>Cones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productionHistory.map((b) => (
                      <tr key={b._id}>
                        <td className="num">{b.reference}</td>
                        <td className="num">{fmtDate(b.productionDate)}</td>
                        <td>{b.qualityName}</td>
                        <td>{b.shadeNo}</td>
                        <td>{b.lotNo}</td>
                        <td className="num">{fmtKg(b.beamWeightKg)}</td>
                        <td className="num">{fmtNum(b.consumedCones)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
