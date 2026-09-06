// Permission-based authorization. Screens/actions check for a permission
// string rather than a hardcoded role name, so new roles can be introduced
// later without touching every controller.

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

export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  STAFF: 'staff',
});

// Default permission sets applied when a role is assigned. Admins/Staff
// permissions can be further customized per-user; Owner is always full
// access and cannot be reduced (enforced in the User model + middleware).
export const DEFAULT_PERMISSIONS_BY_ROLE = Object.freeze({
  [ROLES.OWNER]: ALL_PERMISSIONS,
  [ROLES.ADMIN]: ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.SETTINGS_MANAGE),
  [ROLES.STAFF]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_CREATE,
    PERMISSIONS.BEAM_VIEW,
    PERMISSIONS.BEAM_CREATE,
    PERMISSIONS.QUALITY_VIEW,
    PERMISSIONS.PARTY_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
});

export function permissionsForRole(role) {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] || [];
}
