import { notificationListQuerySchema, notificationPreferencesUpdateSchema } from '@peppermill/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { notificationService } from '../services/notification.service.js';

export const notificationRoutes = Router();

notificationRoutes.use(requireFeature('notifications'));

notificationRoutes.get(
  '/',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    const query = notificationListQuerySchema.parse(req.query);
    res.json(await notificationService.list(req.auth.tenant.id, query));
  }),
);

notificationRoutes.get(
  '/stats',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    res.json(await notificationService.stats(req.auth.tenant.id));
  }),
);

notificationRoutes.post(
  '/read-all',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    res.json(await notificationService.markAllRead(req.auth.tenant.id));
  }),
);

notificationRoutes.get(
  '/preferences',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    res.json(await notificationService.getPreferences(req.auth.tenant.id, req.auth.user.id));
  }),
);

notificationRoutes.patch(
  '/preferences',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    const patch = notificationPreferencesUpdateSchema.parse(req.body);
    res.json(
      await notificationService.updatePreferences(req.auth.tenant.id, req.auth.user.id, patch),
    );
  }),
);

const readBodySchema = z.object({ read: z.boolean().default(true) });

notificationRoutes.patch(
  '/:id/read',
  requirePermission('notifications:read'),
  authedHandler(async (req, res) => {
    const { read } = readBodySchema.parse(req.body ?? {});
    res.json(await notificationService.markRead(req.auth.tenant.id, String(req.params.id), read));
  }),
);
