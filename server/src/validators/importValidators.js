import { z } from 'zod';

export const confirmImportSchema = z.object({
  names: z.array(z.string().trim().min(1)).min(1).max(5000),
});
