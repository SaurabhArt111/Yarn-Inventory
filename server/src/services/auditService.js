import { AuditLog } from '../models/AuditLog.js';

/**
 * Fire-and-forget audit write. Never throws into the caller's request flow
 * (a logging failure should never roll back or fail a business operation),
 * but errors are logged server-side for operators to notice.
 */
export async function recordAudit({ req, action, entityType, entityId, metadata = {} }) {
  try {
    await AuditLog.create({
      tenant: req.tenantId,
      user: req.user?._id || null,
      userName: req.user?.name || 'System',
      action,
      entityType,
      entityId: entityId || null,
      metadata: sanitizeMetadata(metadata),
      ip: req.ip,
      userAgent: req.get?.('user-agent') || '',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record audit log:', err.message);
  }
}

// Strip anything that looks like a credential before it ever reaches the
// audit collection, even if a caller accidentally includes it.
function sanitizeMetadata(metadata) {
  const clone = JSON.parse(JSON.stringify(metadata || {}));
  const forbiddenKeys = ['password', 'passwordHash', 'currentPassword', 'newPassword', 'token'];
  const strip = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (forbiddenKeys.includes(key)) delete obj[key];
      else if (typeof obj[key] === 'object') strip(obj[key]);
    }
  };
  strip(clone);
  return clone;
}
