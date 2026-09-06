// Mirrors server/src/constants/permissions.js -- kept in sync manually since
// frontend and backend are separate deployable apps. The backend remains
// authoritative regardless of what this file says.
export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  STOCK_VIEW: 'stock.view',
  STOCK_CREATE: 'stock.create',
  STOCK_EDIT: 'stock.edit',
  STOCK_DELETE: 'stock.delete',
  BEAM_VIEW: 'beam.view',
  BEAM_CREATE: 'beam.create',
  BEAM_EDIT: 'beam.edit',
  BEAM_DELETE: 'beam.delete',
  QUALITY_VIEW: 'quality.view',
  QUALITY_CREATE: 'quality.create',
  QUALITY_EDIT: 'quality.edit',
  QUALITY_DELETE: 'quality.delete',
  QUALITY_IMPORT: 'quality.import',
  PARTY_VIEW: 'party.view',
  PARTY_CREATE: 'party.create',
  PARTY_EDIT: 'party.edit',
  PARTY_DELETE: 'party.delete',
  COMPANY_VIEW: 'company.view',
  COMPANY_CREATE: 'company.create',
  COMPANY_EDIT: 'company.edit',
  COMPANY_DELETE: 'company.delete',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  ANALYTICS_VIEW: 'analytics.view',
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
});

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
