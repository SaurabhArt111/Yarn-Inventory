import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export const corsMiddleware = cors({
  origin: env.clientOrigin,
  credentials: true,
});

// General API rate limit -- generous enough for normal SPA usage but caps
// abuse/scraping.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

// Tighter limit specifically on auth endpoints to slow down credential
// stuffing / brute force attempts.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' } },
});
