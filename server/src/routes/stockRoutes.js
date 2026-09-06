import { Router } from 'express';
import * as ctrl from '../controllers/stockController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';
import { createStockEntrySchema, updateStockEntrySchema, stockListQuerySchema } from '../validators/stockValidators.js';

const router = Router();
router.use(requireDb, authenticate);

router.get('/available', requirePermission(PERMISSIONS.BEAM_CREATE), ctrl.listAvailableStock);
router.get('/', requirePermission(PERMISSIONS.STOCK_VIEW), validateQuery(stockListQuerySchema), ctrl.listStockEntries);
router.post('/', requirePermission(PERMISSIONS.STOCK_CREATE), validateBody(createStockEntrySchema), ctrl.createStockEntry);
router.get('/:id', requirePermission(PERMISSIONS.STOCK_VIEW), validateParams(idParam), ctrl.getStockEntry);
router.patch('/:id', requirePermission(PERMISSIONS.STOCK_EDIT), validateParams(idParam), validateBody(updateStockEntrySchema), ctrl.updateStockEntry);
router.delete('/:id', requirePermission(PERMISSIONS.STOCK_DELETE), validateParams(idParam), ctrl.cancelStockEntry);

export default router;
