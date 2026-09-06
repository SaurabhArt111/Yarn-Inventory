import { Router } from 'express';
import * as ctrl from '../controllers/beamController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';
import { createBeamSchema, updateBeamSchema, cancelBeamSchema, beamListQuerySchema } from '../validators/beamValidators.js';
import { z } from 'zod';

const router = Router();
router.use(requireDb, authenticate);

const previewQuerySchema = z.object({
  ends: z.string(),
  meter: z.string(),
  finalDenier: z.string(),
});

router.get('/preview-weight', requirePermission(PERMISSIONS.BEAM_CREATE), validateQuery(previewQuerySchema), ctrl.previewBeamWeight);
router.get('/', requirePermission(PERMISSIONS.BEAM_VIEW), validateQuery(beamListQuerySchema), ctrl.listBeams);
router.post('/', requirePermission(PERMISSIONS.BEAM_CREATE), validateBody(createBeamSchema), ctrl.createBeam);
router.get('/:id', requirePermission(PERMISSIONS.BEAM_VIEW), validateParams(idParam), ctrl.getBeam);
router.patch('/:id', requirePermission(PERMISSIONS.BEAM_EDIT), validateParams(idParam), validateBody(updateBeamSchema), ctrl.updateBeam);
router.post('/:id/cancel', requirePermission(PERMISSIONS.BEAM_DELETE), validateParams(idParam), validateBody(cancelBeamSchema), ctrl.cancelBeam);

export default router;
