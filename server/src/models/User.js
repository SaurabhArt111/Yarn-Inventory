import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, permissionsForRole } from '../constants/permissions.js';

const userSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, default: ROLES.STAFF },
    // Owner always has every permission (enforced below); Admin/Staff can
    // have their permission set customized independently of the default.
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One email per tenant (not globally unique) so different businesses can
// each have a user with the same email address, but never within the same
// tenant, and lookups during login are always scoped correctly.
userSchema.index({ tenant: 1, email: 1 }, { unique: true });

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.effectivePermissions = function effectivePermissions() {
  if (this.role === ROLES.OWNER) return permissionsForRole(ROLES.OWNER);
  return this.permissions?.length ? this.permissions : permissionsForRole(this.role);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    permissions: this.effectivePermissions(),
    status: this.status,
    tenant: this.tenant,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
