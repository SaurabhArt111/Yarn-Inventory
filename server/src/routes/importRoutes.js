import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/importController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { requireDb } from '../utils/requireDb.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { confirmImportSchema } from '../validators/importValidators.js';
import { ApiError } from '../utils/ApiError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    const okTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // some browsers send this for .csv
    ];
    if (!okTypes.includes(file.mimetype) && !/\.(csv|xlsx?)$/i.test(file.originalname)) {
      return cb(ApiError.badRequest('Only CSV or Excel files are supported'));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireDb, authenticate, requirePermission(PERMISSIONS.QUALITY_IMPORT));

router.post('/quality/preview', upload.single('file'), ctrl.previewQualityImport);
router.post('/quality/confirm', validateBody(confirmImportSchema), ctrl.confirmQualityImport);

export default router;
