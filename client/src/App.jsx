import { Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireGuest, RequirePermission } from './components/RouteGuards.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { PERMISSIONS } from './constants/permissions.js';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Qualities from './pages/masters/Qualities.jsx';
import Parties from './pages/masters/Parties.jsx';
import Companies from './pages/masters/Companies.jsx';
import StockList from './pages/stock/StockList.jsx';
import BeamProduction from './pages/beam/BeamProduction.jsx';
import BeamInventory from './pages/beam/BeamInventory.jsx';
import AnalyticsOverview from './pages/analytics/Overview.jsx';
import QualityAnalysis from './pages/analytics/QualityAnalysis.jsx';
import PartyAnalysis from './pages/analytics/PartyAnalysis.jsx';
import CompanyAnalysis from './pages/analytics/CompanyAnalysis.jsx';
import Reports from './pages/reports/Reports.jsx';
import Staff from './pages/staff/Staff.jsx';
import Settings from './pages/settings/Settings.jsx';

function Gate({ permission, children }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RequireGuest>
            <Login />
          </RequireGuest>
        }
      />
      <Route
        path="/register"
        element={
          <RequireGuest>
            <Register />
          </RequireGuest>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Gate permission={PERMISSIONS.DASHBOARD_VIEW}><Dashboard /></Gate>} />

        <Route path="stock" element={<Gate permission={PERMISSIONS.STOCK_VIEW}><StockList /></Gate>} />
        <Route path="beams/new" element={<Gate permission={PERMISSIONS.BEAM_CREATE}><BeamProduction /></Gate>} />
        <Route path="beams" element={<Gate permission={PERMISSIONS.BEAM_VIEW}><BeamInventory /></Gate>} />

        <Route path="masters/qualities" element={<Gate permission={PERMISSIONS.QUALITY_VIEW}><Qualities /></Gate>} />
        <Route path="masters/parties" element={<Gate permission={PERMISSIONS.PARTY_VIEW}><Parties /></Gate>} />
        <Route path="masters/companies" element={<Gate permission={PERMISSIONS.COMPANY_VIEW}><Companies /></Gate>} />

        <Route path="analytics" element={<Gate permission={PERMISSIONS.ANALYTICS_VIEW}><AnalyticsOverview /></Gate>} />
        <Route path="analytics/quality" element={<Gate permission={PERMISSIONS.ANALYTICS_VIEW}><QualityAnalysis /></Gate>} />
        <Route path="analytics/party" element={<Gate permission={PERMISSIONS.ANALYTICS_VIEW}><PartyAnalysis /></Gate>} />
        <Route path="analytics/company" element={<Gate permission={PERMISSIONS.ANALYTICS_VIEW}><CompanyAnalysis /></Gate>} />

        <Route path="reports" element={<Gate permission={PERMISSIONS.REPORTS_VIEW}><Reports /></Gate>} />
        <Route path="staff" element={<Gate permission={PERMISSIONS.STAFF_VIEW}><Staff /></Gate>} />
        <Route path="settings" element={<Gate permission={PERMISSIONS.SETTINGS_MANAGE}><Settings /></Gate>} />
      </Route>

      <Route path="*" element={<div className="page-body">Page not found.</div>} />
    </Routes>
  );
}
