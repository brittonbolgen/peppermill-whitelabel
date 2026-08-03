import { Router } from 'express';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { monitoringService } from '../services/monitoring.service.js';

export const monitoringRoutes = Router();

monitoringRoutes.use(requireFeature('monitoring'));

monitoringRoutes.get(
  '/',
  requirePermission('monitoring:read'),
  authedHandler(async (req, res) => {
    res.json(await monitoringService.overview(req.auth.tenant.id));
  }),
);
