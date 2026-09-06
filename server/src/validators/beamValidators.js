import { z } from 'zod';
import { objectId } from './common.js';

export const createBeamSchema = z.object({
  sourceStockEntry: objectId,
  productionDate: z.coerce.date(),
  challanNo: z.string().trim().max(60).optional().default(''),
  lotNo: z.string().trim().min(1).max(60),
  ends: z.coerce.number().positive(),
  finalDenier: z.coerce.number().positive(),
  meter: z.coerce.number().positive(),
  // Number of cones physically consumed from the source stock to produce
  // this beam -- a second inventory dimension tracked alongside weight.
  consumedCones: z.coerce.number().int().positive('Cones used must be a positive whole number'),
  width: z.string().trim().max(60).optional().default(''),
  pipes: z.string().trim().max(200).optional().default(''), // TEXT by design, never numeric-only
  remarks: z.string().trim().max(500).optional().default(''),
  // Frontend may send its own calculated weight for display/optimistic UI
  // purposes only -- it is always ignored server-side in favor of a fresh
  // recalculation from ends/meter/finalDenier.
  clientCalculatedWeightKg: z.coerce.number().optional(),
});

export const updateBeamSchema = z.object({
  productionDate: z.coerce.date().optional(),
  challanNo: z.string().trim().max(60).optional(),
  width: z.string().trim().max(60).optional(),
  pipes: z.string().trim().max(200).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const cancelBeamSchema = z.object({
  reason: z.string().trim().min(1).max(300),
});

export const beamListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  quality: objectId.optional(),
  shadeId: objectId.optional(),
  party: objectId.optional(),
  company: objectId.optional(),
  lotNo: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.enum(['productionDate', 'createdAt', 'beamWeightKg']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
