import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PERMISSIONS } from '../constants/permissions.js';

const NAV = [
  {
    items: [{ label: 'Dashboard', to: '/', permission: PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Stock Entries', to: '/stock', permission: PERMISSIONS.STOCK_VIEW },
      { label: 'Beam Production', to: '/beams/new', permission: PERMISSIONS.BEAM_CREATE },
      { label: 'Beam Inventory', to: '/beams', permission: PERMISSIONS.BEAM_VIEW },
    ],
  },
  {
    group: 'Masters',
    items: [
      { label: 'Qualities', to: '/masters/qualities', permission: PERMISSIONS.QUALITY_VIEW },
      { label: 'Parties', to: '/masters/parties', permission: PERMISSIONS.PARTY_VIEW },
      { label: 'Companies', to: '/masters/companies', permission: PERMISSIONS.COMPANY_VIEW },
    ],
  },
  {
    group: 'Analytics',
    items: [
      { label: 'Overview', to: '/analytics', permission: PERMISSIONS.ANALYTICS_VIEW },
      { label: 'Quality Analysis', to: '/analytics/quality', permission: PERMISSIONS.ANALYTICS_VIEW },
      { label: 'Party Analysis', to: '/analytics/party', permission: PERMISSIONS.ANALYTICS_VIEW },
      { label: 'Company Analysis', to: '/analytics/company', permission: PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    group: 'Reports',
    items: [{ label: 'Reports', to: '/reports', permission: PERMISSIONS.REPORTS_VIEW }],
  },
  {
    items: [
      { label: 'Staff', to: '/staff', permission: PERMISSIONS.STAFF_VIEW },
      { label: 'Audit Log', to: '/audit', permission: PERMISSIONS.AUDIT_VIEW },
      { label: 'Settings', to: '/settings', permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];

export default function AppLayout() {
  const { user, tenant, logout, can } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="mark">Y</span>
          <span>{tenant?.name || 'Yarn ERP'}</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((section, i) => {
            const visibleItems = section.items.filter((item) => !item.permission || can(item.permission));
            if (visibleItems.length === 0) return null;
            return (
              <div key={i}>
                {section.group && <div className="sidebar-group-label">{section.group}</div>}
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ color: '#fff', fontWeight: 500 }}>{user?.name}</div>
          <div>{user?.role}</div>
        </div>
      </aside>

      <div className={`sidebar-scrim ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          <div className="row">
            <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              ☰
            </button>
            <span className="topbar-title">{tenant?.name}</span>
          </div>
          <div className="row">
            <span className="muted" style={{ fontSize: 13 }}>
              {user?.email}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
