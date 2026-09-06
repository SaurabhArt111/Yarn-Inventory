import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ROLES, ALL_PERMISSIONS, permissionsForRole } from '../constants/permissions.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../services/auditService.js';

export const listStaff = catchAsync(async (req, res) => {
  const users = await User.find({ tenant: req.tenantId }).sort({ createdAt: 1 }).lean();
  res.json({
    items: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.role === ROLES.OWNER ? permissionsForRole(ROLES.OWNER) : u.permissions?.length ? u.permissions : permissionsForRole(u.role),
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
    availablePermissions: ALL_PERMISSIONS,
  });
});

export const inviteStaff = catchAsync(async (req, res) => {
  const { name, email, role, permissions, password } = req.body;

  if (role === ROLES.OWNER) {
    throw ApiError.badRequest('A workspace can only have one Owner, assigned at registration');
  }

  const existing = await User.findOne({ tenant: req.tenantId, email });
  if (existing) throw ApiError.conflict('A user with this email already exists in this workspace');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    tenant: req.tenantId,
    name,
    email,
    passwordHash,
    role,
    permissions: permissions?.length ? permissions : permissionsForRole(role),
  });

  await recordAudit({ req, action: 'staff.created', entityType: 'User', entityId: user._id, metadata: { email, role } });
  res.status(201).json({ item: user.toSafeJSON() });
});

export const updateStaffPermissions = catchAsync(async (req, res) => {
  const target = await User.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!target) throw ApiError.notFound('Staff member not found');
  if (target.role === ROLES.OWNER) {
    throw ApiError.forbidden("The Owner's permissions cannot be reduced");
  }

  if (req.body.role) target.role = req.body.role;
  if (req.body.permissions) target.permissions = req.body.permissions;
  await target.save();

  await recordAudit({
    req,
    action: 'staff.permissions_changed',
    entityType: 'User',
    entityId: target._id,
    metadata: { role: target.role, permissions: target.permissions },
  });
  res.json({ item: target.toSafeJSON() });
});

export const updateStaffStatus = catchAsync(async (req, res) => {
  const target = await User.findOne({ _id: req.params.id, tenant: req.tenantId });
  if (!target) throw ApiError.notFound('Staff member not found');
  if (target.role === ROLES.OWNER) throw ApiError.forbidden('The Owner account cannot be disabled');
  if (String(target._id) === String(req.user._id)) throw ApiError.badRequest('You cannot change your own account status');

  target.status = req.body.status;
  await target.save();

  await recordAudit({ req, action: 'staff.status_changed', entityType: 'User', entityId: target._id, metadata: { status: target.status } });
  res.json({ item: target.toSafeJSON() });
});
