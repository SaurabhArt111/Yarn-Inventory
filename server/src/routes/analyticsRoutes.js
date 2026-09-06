import { Router } from 'express';
import * as ctrl from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateParams } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';

const router = Router();
router.use(requireDb, authenticate, requirePermission(PERMISSIONS.ANALYTICS_VIEW));

router.get('/overview', ctrl.overview);
router.get('/quality/options', ctrl.qualityOptions);
router.get('/party/options', ctrl.partyOptions);
router.get('/company/options', ctrl.companyOptions);
router.get('/quality/:id', validateParams(idParam), ctrl.analyzeQuality);
router.get('/party/:id', validateParams(idParam), ctrl.analyzeParty);
router.get('/company/:id', validateParams(idParam), ctrl.analyzeCompany);

export default router;
