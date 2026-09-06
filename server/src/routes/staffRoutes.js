import { Router } from 'express';
import * as ctrl from '../controllers/staffController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { idParam } from '../validators/common.js';
import { inviteStaffSchema, updatePermissionsSchema, updateStatusSchema } from '../validators/staffValidators.js';

const router = Router();
router.use(requireDb, authenticate);

router.get('/', requirePermission(PERMISSIONS.STAFF_VIEW), ctrl.listStaff);
router.post('/', requirePermission(PERMISSIONS.STAFF_MANAGE), validateBody(inviteStaffSchema), ctrl.inviteStaff);
router.patch('/:id/permissions', requirePermission(PERMISSIONS.STAFF_MANAGE), validateParams(idParam), validateBody(updatePermissionsSchema), ctrl.updateStaffPermissions);
router.patch('/:id/status', requirePermission(PERMISSIONS.STAFF_MANAGE), validateParams(idParam), validateBody(updateStatusSchema), ctrl.updateStaffStatus);

export default router;
