import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { authRateLimiter } from '../middleware/security.js';
import { requireDb } from '../utils/requireDb.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), requireDb, authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), requireDb, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireDb, authenticate, authController.me);

export default router;
