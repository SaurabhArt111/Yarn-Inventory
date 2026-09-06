import { z } from 'zod';
import { ROLES, ALL_PERMISSIONS } from '../constants/permissions.js';

const password = z
  .string()
  .min(8)
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), { message: 'Password must contain both letters and numbers' });

export const inviteStaffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum([ROLES.ADMIN, ROLES.STAFF]),
  permissions: z.array(z.enum(ALL_PERMISSIONS)).optional(),
  password,
});

export const updatePermissionsSchema = z.object({
  role: z.enum([ROLES.ADMIN, ROLES.STAFF]).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS)).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});
