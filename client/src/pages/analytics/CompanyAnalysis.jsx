import { DimensionAnalysisPage } from './DimensionAnalysisPage.jsx';
import { analyticsApi } from '../../api/analytics.js';

export default function CompanyAnalysis() {
  return (
    <DimensionAnalysisPage
      title="Company Analysis"
      description="Drill into a single operational company's stock, consumption and production history."
      loadOptions={(q) => analyticsApi.companyOptions().then((r) => r.items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())))}
      analyze={(id) => analyticsApi.analyzeCompany(id)}
    />
  );
}
