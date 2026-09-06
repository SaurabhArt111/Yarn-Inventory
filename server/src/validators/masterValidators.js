import { z } from 'zod';

export const createQualitySchema = z.object({
  name: z.string().trim().min(1).max(160),
  shades: z.array(z.string().trim().min(1).max(60)).optional().default([]),
});

export const updateQualitySchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const addShadeSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const updateShadeSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const partySchema = z.object({
  name: z.string().trim().min(1).max(160),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const companySchema = z.object({
  name: z.string().trim().min(1).max(160),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});
