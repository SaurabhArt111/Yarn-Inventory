import { Router } from 'express';
import * as ctrl from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();
router.use(requireDb, authenticate, requirePermission(PERMISSIONS.DASHBOARD_VIEW));

router.get('/', ctrl.getDashboard);
router.get('/qualities', ctrl.getQualitySummaries);

export default router;
