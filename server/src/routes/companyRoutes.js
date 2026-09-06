import { Router } from 'express';
import { companyController as ctrl } from '../controllers/companyController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';
import { companySchema } from '../validators/masterValidators.js';

const router = Router();
router.use(requireDb, authenticate);

router.get('/select', requirePermission(PERMISSIONS.COMPANY_VIEW), ctrl.listForSelect);
router.get('/', requirePermission(PERMISSIONS.COMPANY_VIEW), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.COMPANY_CREATE), validateBody(companySchema), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.COMPANY_VIEW), validateParams(idParam), ctrl.getOne);
router.patch('/:id', requirePermission(PERMISSIONS.COMPANY_EDIT), validateParams(idParam), validateBody(companySchema.partial()), ctrl.update);
router.delete('/:id', requirePermission(PERMISSIONS.COMPANY_DELETE), validateParams(idParam), ctrl.remove);

export default router;
