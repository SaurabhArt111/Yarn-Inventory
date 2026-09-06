import { Router } from 'express';
import { partyController as ctrl } from '../controllers/partyController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';
import { partySchema } from '../validators/masterValidators.js';

const router = Router();
router.use(requireDb, authenticate);

router.get('/select', requirePermission(PERMISSIONS.PARTY_VIEW), ctrl.listForSelect);
router.get('/', requirePermission(PERMISSIONS.PARTY_VIEW), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.PARTY_CREATE), validateBody(partySchema), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.PARTY_VIEW), validateParams(idParam), ctrl.getOne);
router.patch('/:id', requirePermission(PERMISSIONS.PARTY_EDIT), validateParams(idParam), validateBody(partySchema.partial()), ctrl.update);
router.delete('/:id', requirePermission(PERMISSIONS.PARTY_DELETE), validateParams(idParam), ctrl.remove);

export default router;
