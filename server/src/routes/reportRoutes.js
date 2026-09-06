import { Router } from 'express';
import * as ctrl from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();
router.use(requireDb, authenticate, requirePermission(PERMISSIONS.REPORTS_VIEW));

router.get('/stock', ctrl.stockReport);
router.get('/beams', ctrl.beamReport);
router.get('/inventory', ctrl.inventoryReport);
router.get('/parties', ctrl.partyReport);
router.get('/companies', ctrl.companyReport);
router.get('/qualities', ctrl.qualityReport);

export default router;
