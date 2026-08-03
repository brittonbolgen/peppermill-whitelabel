import { alertBulkResolveSchema, alertListQuerySchema, alertResolveSchema } from '@peppermill/shared';
import { Router } from 'express';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { alertService } from '../services/alert.service.js';

export const alertRoutes = Router();

alertRoutes.use(requireFeature('alerts'));

alertRoutes.get(
  '/',
  requirePermission('alerts:read'),
  authedHandler(async (req, res) => {
    const query = alertListQuerySchema.parse(req.query);
    res.json(await alertService.list(req.auth.tenant.id, query));
  }),
);

alertRoutes.get(
  '/stats',
  requirePermission('alerts:read'),
  authedHandler(async (req, res) => {
    res.json(await alertService.stats(req.auth.tenant.id));
  }),
);

alertRoutes.post(
  '/bulk-resolve',
  requirePermission('alerts:resolve'),
  authedHandler(async (req, res) => {
    const input = alertBulkResolveSchema.parse(req.body);
    res.json(await alertService.bulkResolve(req.auth.tenant.id, input, req.auth.user));
  }),
);

alertRoutes.get(
  '/:id',
  requirePermission('alerts:read'),
  authedHandler(async (req, res) => {
    res.json(await alertService.getById(req.auth.tenant.id, String(req.params.id)));
  }),
);

alertRoutes.post(
  '/:id/resolve',
  requirePermission('alerts:resolve'),
  authedHandler(async (req, res) => {
    const input = alertResolveSchema.parse(req.body);
    res.json(
      await alertService.resolve(req.auth.tenant.id, String(req.params.id), input, req.auth.user),
    );
  }),
);
