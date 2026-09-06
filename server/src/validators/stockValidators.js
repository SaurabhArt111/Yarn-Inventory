import { z } from 'zod';
import { objectId } from './common.js';

export const createStockEntrySchema = z.object({
  date: z.coerce.date(),
  challanNo: z.string().trim().min(1).max(60),
  quality: objectId,
  shadeId: objectId,
  party: objectId,
  company: objectId,
  box: z.string().trim().max(60).optional().default(''),
  totalCones: z.coerce.number().int().min(0),
  netWeightKg: z.coerce.number().positive('Net weight must be greater than 0'),
  lotNo: z.string().trim().min(1).max(60),
  remarks: z.string().trim().max(500).optional().default(''),
});

export const updateStockEntrySchema = z.object({
  date: z.coerce.date().optional(),
  challanNo: z.string().trim().min(1).max(60).optional(),
  box: z.string().trim().max(60).optional(),
  lotNo: z.string().trim().min(1).max(60).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const stockListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  quality: objectId.optional(),
  party: objectId.optional(),
  company: objectId.optional(),
  lotNo: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.enum(['date', 'createdAt', 'netWeightKg']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
