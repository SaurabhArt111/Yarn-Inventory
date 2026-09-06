import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * CRITICAL SECURITY BOUNDARY: tenantId/userId/role/permissions are NEVER
 * read from request body/query/params. They are derived exclusively from
 * the signed JWT (issued only at login/register) and re-verified against
 * the current user record on every request, so a disabled account or a
 * role change takes effect immediately rather than living inside a stale
 * token.
 */
export const authenticate = catchAsync(async (req, res, next) => {
  const token = req.cookies?.[env.cookieName];
  if (!token) return next(ApiError.unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return next(ApiError.unauthorized('Session is invalid or has expired'));
  }

  const user = await User.findOne({ _id: payload.sub, tenant: payload.tenant }).select('+passwordHash');
  if (!user) return next(ApiError.unauthorized('Account no longer exists'));
  if (user.status !== 'active') {
    return next(ApiError.unauthorized('This account has been disabled'));
  }

  req.user = user;
  req.tenantId = String(user.tenant);
  req.permissions = user.effectivePermissions();
  next();
});

// Attaches user/tenant if a valid session is present but does not reject
// the request otherwise. Used for endpoints that behave differently for
// authenticated vs anonymous callers (currently unused but kept available
// for future public endpoints).
export const authenticateOptional = catchAsync(async (req, res, next) => {
  const token = req.cookies?.[env.cookieName];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findOne({ _id: payload.sub, tenant: payload.tenant });
    if (user && user.status === 'active') {
      req.user = user;
      req.tenantId = String(user.tenant);
      req.permissions = user.effectivePermissions();
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

export function issueToken(user) {
  return jwt.sign({ sub: String(user._id), tenant: String(user.tenant), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days; session otherwise persists until explicit logout
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, { path: '/' });
}
