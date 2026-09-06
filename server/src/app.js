import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import { isDbReady, getDbStatus } from './config/db.js';
import { securityHeaders, corsMiddleware, apiRateLimiter } from './middleware/security.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import qualityRoutes from './routes/qualityRoutes.js';
import partyRoutes from './routes/partyRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import beamRoutes from './routes/beamRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import importRoutes from './routes/importRoutes.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip / secure cookies
  // when deployed behind a load balancer or reverse proxy).
  app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api', apiRateLimiter);

  // Health check never requires DB or auth -- used by orchestrators and by
  // this project's own smoke tests to confirm the process is alive even
  // when the database is not yet reachable.
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), db: getDbStatus() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/qualities', qualityRoutes);
  app.use('/api/parties', partyRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/stock-entries', stockRoutes);
  app.use('/api/beams', beamRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/import', importRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { isDbReady };
