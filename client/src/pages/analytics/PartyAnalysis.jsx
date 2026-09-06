import { DimensionAnalysisPage } from './DimensionAnalysisPage.jsx';
import { analyticsApi } from '../../api/analytics.js';

export default function PartyAnalysis() {
  return (
    <DimensionAnalysisPage
      title="Party Analysis"
      description="Drill into a single party's stock, consumption and production history."
      loadOptions={(q) => analyticsApi.partyOptions().then((r) => r.items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())))}
      analyze={(id) => analyticsApi.analyzeParty(id)}
    />
  );
}
