import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { ROLES, permissionsForRole } from '../constants/permissions.js';
import { issueToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'workspace'
  );
}

async function uniqueSlug(base) {
  let slug = base;
  let suffix = 1;
  // Small bounded loop; collisions are rare and this only runs once at
  // registration time.
  // eslint-disable-next-line no-await-in-loop
  while (await Tenant.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

/**
 * Registration creates the tenant/workspace AND its first Owner user in one
 * atomic step -- a business should never end up with a workspace but no
 * way to log into it, or a user with no workspace.
 */
export const register = catchAsync(async (req, res) => {
  const { companyName, businessType, ownerName, email, password, phone } = req.body;

  const session = await mongoose.startSession();
  let tenant;
  let user;
  try {
    await session.withTransaction(async () => {
      const slug = await uniqueSlug(slugify(companyName));
      [tenant] = await Tenant.create([{ name: companyName, slug, businessType, phone }], { session });

      const existing = await User.findOne({ tenant: tenant._id, email }).session(session);
      if (existing) throw ApiError.conflict('An account with this email already exists in this workspace');

      const passwordHash = await bcrypt.hash(password, 12);
      [user] = await User.create(
        [
          {
            tenant: tenant._id,
            name: ownerName,
            email,
            passwordHash,
            role: ROLES.OWNER,
            permissions: permissionsForRole(ROLES.OWNER),
          },
        ],
        { session }
      );
    });
  } catch (err) {
    if (isTransactionsUnsupportedError(err)) {
      // Standalone MongoDB fallback (see inventoryService for rationale).
      const slug = await uniqueSlug(slugify(companyName));
      tenant = await Tenant.create({ name: companyName, slug, businessType, phone });
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({
        tenant: tenant._id,
        name: ownerName,
        email,
        passwordHash,
        role: ROLES.OWNER,
        permissions: permissionsForRole(ROLES.OWNER),
      });
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  const token = issueToken(user);
  setAuthCookie(res, token);
  req.user = user;
  req.tenantId = String(tenant._id);

  res.status(201).json({ user: user.toSafeJSON(), tenant: sanitizeTenant(tenant) });
});

function isTransactionsUnsupportedError(err) {
  const msg = String(err?.message || '');
  return msg.includes('Transaction numbers are only allowed') || err?.codeName === 'IllegalOperation';
}

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Deliberately look up by email across tenants (a user only knows their
  // own email, not their tenant id) but every subsequent request is scoped
  // by the tenant embedded in the resulting token, never a client-supplied
  // value.
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) return next(ApiError.unauthorized('Invalid email or password'));
  if (user.status !== 'active') return next(ApiError.unauthorized('This account has been disabled'));

  const valid = await user.comparePassword(password);
  if (!valid) return next(ApiError.unauthorized('Invalid email or password'));

  user.lastLoginAt = new Date();
  await user.save();

  const token = issueToken(user);
  setAuthCookie(res, token);

  req.user = user;
  req.tenantId = String(user.tenant);
  const tenant = await Tenant.findById(user.tenant);
  res.json({ user: user.toSafeJSON(), tenant: sanitizeTenant(tenant) });
});

export const logout = catchAsync(async (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

export const me = catchAsync(async (req, res) => {
  if (!req.user) return res.json({ user: null, tenant: null });
  const tenant = await Tenant.findById(req.tenantId);
  res.json({ user: req.user.toSafeJSON(), tenant: sanitizeTenant(tenant) });
});

function sanitizeTenant(tenant) {
  if (!tenant) return null;
  return {
    id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    businessType: tenant.businessType,
    plan: tenant.plan,
    settings: tenant.settings,
  };
}
