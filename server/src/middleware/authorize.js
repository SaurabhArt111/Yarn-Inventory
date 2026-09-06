import { ApiError } from '../utils/ApiError.js';
import { hasPermission } from '../utils/permissionCheck.js';

/**
 * Backend-authoritative RBAC. The frontend hides screens/actions the user
 * lacks permission for as a UX convenience, but every mutating/sensitive
 * route re-checks permissions here regardless of what the client sends or
 * hides -- this is the real security boundary.
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!hasPermission(req.permissions, permissions)) {
      return next(ApiError.forbidden(`Missing required permission: ${permissions.join(', ')}`));
    }
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('This action is restricted to a different role'));
    }
    next();
  };
}
