import { analyticsQuerySchema, savedReportCreateSchema } from '@peppermill/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { analyticsService } from '../services/analytics.service.js';

export const analyticsRoutes = Router();

analyticsRoutes.use(requireFeature('analytics'));

analyticsRoutes.get(
  '/overview',
  requirePermission('analytics:read'),
  authedHandler(async (req, res) => {
    const query = analyticsQuerySchema.parse(req.query);
    res.json(await analyticsService.overview(req.auth.tenant.id, query));
  }),
);

analyticsRoutes.get(
  '/reports',
  requirePermission('analytics:read'),
  authedHandler(async (req, res) => {
    res.json({ data: await analyticsService.listReports(req.auth.tenant.id) });
  }),
);

analyticsRoutes.post(
  '/reports',
  requirePermission('analytics:export'),
  authedHandler(async (req, res) => {
    const input = savedReportCreateSchema.parse(req.body);
    res.status(201).json(await analyticsService.createReport(req.auth.tenant.id, input, req.auth.user));
  }),
);

analyticsRoutes.post(
  '/reports/:id/run',
  requirePermission('analytics:export'),
  authedHandler(async (req, res) => {
    res.json(await analyticsService.runReport(req.auth.tenant.id, String(req.params.id)));
  }),
);

analyticsRoutes.delete(
  '/reports/:id',
  requirePermission('analytics:export'),
  authedHandler(async (req, res) => {
    await analyticsService.deleteReport(req.auth.tenant.id, String(req.params.id));
    res.status(204).end();
  }),
);

const exportQuerySchema = z.object({
  dataset: z.enum(['cases', 'alerts', 'recovery', 'ratio']).default('cases'),
});

analyticsRoutes.get(
  '/export',
  requirePermission('analytics:export'),
  authedHandler(async (req, res) => {
    const { dataset } = exportQuerySchema.parse(req.query);
    const csv = await analyticsService.exportCsv(req.auth.tenant.id, dataset);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.auth.tenant.slug}-${dataset}-${stamp}.csv"`,
    );
    res.send(csv);
  }),
);
