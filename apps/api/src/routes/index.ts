import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { alertRoutes } from './alert.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { authRoutes } from './auth.routes.js';
import { caseRoutes } from './case.routes.js';
import { monitoringRoutes } from './monitoring.routes.js';
import { notificationRoutes } from './notification.routes.js';
import { supportRoutes } from './support.routes.js';
import { tenantRoutes } from './tenant.routes.js';
import { userRoutes } from './user.routes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Auth and tenant branding are reachable before sign-in; everything below
// mounts behind `requireAuth`, so no resource route can be hit anonymously.
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/tenants', tenantRoutes);

apiRoutes.use(requireAuth);

apiRoutes.use('/cases', caseRoutes);
apiRoutes.use('/alerts', alertRoutes);
apiRoutes.use('/analytics', analyticsRoutes);
apiRoutes.use('/notifications', notificationRoutes);
apiRoutes.use('/monitoring', monitoringRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/support', supportRoutes);
