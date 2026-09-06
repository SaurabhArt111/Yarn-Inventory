import { Router } from 'express';
import * as ctrl from '../controllers/qualityController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { z } from 'zod';
import { objectId } from '../validators/common.js';
import {
  createQualitySchema,
  updateQualitySchema,
  addShadeSchema,
  updateShadeSchema,
} from '../validators/masterValidators.js';

const router = Router();
router.use(requireDb, authenticate);

const idParams = z.object({ id: objectId });
const shadeParams = z.object({ id: objectId, shadeId: objectId });

router.get('/select', requirePermission(PERMISSIONS.QUALITY_VIEW), ctrl.listQualitiesForSelect);
router.get('/', requirePermission(PERMISSIONS.QUALITY_VIEW), ctrl.listQualities);
router.post('/', requirePermission(PERMISSIONS.QUALITY_CREATE), validateBody(createQualitySchema), ctrl.createQuality);
router.get('/:id', requirePermission(PERMISSIONS.QUALITY_VIEW), validateParams(idParams), ctrl.getQuality);
router.get('/:id/detail', requirePermission(PERMISSIONS.QUALITY_VIEW), validateParams(idParams), ctrl.qualityDetail);
router.patch('/:id', requirePermission(PERMISSIONS.QUALITY_EDIT), validateParams(idParams), validateBody(updateQualitySchema), ctrl.updateQuality);
router.delete('/:id', requirePermission(PERMISSIONS.QUALITY_DELETE), validateParams(idParams), ctrl.deleteQuality);

router.post('/:id/shades', requirePermission(PERMISSIONS.QUALITY_EDIT), validateParams(idParams), validateBody(addShadeSchema), ctrl.addShade);
router.patch('/:id/shades/:shadeId', requirePermission(PERMISSIONS.QUALITY_EDIT), validateParams(shadeParams), validateBody(updateShadeSchema), ctrl.updateShade);
router.delete('/:id/shades/:shadeId', requirePermission(PERMISSIONS.QUALITY_EDIT), validateParams(shadeParams), ctrl.deleteShade);

export default router;
