import { z } from 'zod';
import mongoose from 'mongoose';

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: 'Must be a valid id',
});

export const idParam = z.object({ id: objectId });

export const dateRangeQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const listQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});
