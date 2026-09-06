import { DimensionAnalysisPage } from './DimensionAnalysisPage.jsx';
import { analyticsApi } from '../../api/analytics.js';

export default function QualityAnalysis() {
  return (
    <DimensionAnalysisPage
      title="Quality Analysis"
      description="Drill into a single quality's stock, consumption and production history."
      loadOptions={(q) => analyticsApi.qualityOptions().then((r) => r.items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())))}
      analyze={(id) => analyticsApi.analyzeQuality(id)}
    />
  );
}
