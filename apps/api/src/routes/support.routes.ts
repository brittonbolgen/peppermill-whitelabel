import { ticketCreateSchema, ticketListQuerySchema, ticketReplySchema } from '@peppermill/shared';
import { Router } from 'express';
import { z } from 'zod';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { supportService } from '../services/support.service.js';

export const supportRoutes = Router();

supportRoutes.use(requireFeature('support'));

supportRoutes.get(
  '/overview',
  requirePermission('support:read'),
  authedHandler(async (req, res) => {
    res.json(await supportService.overview(req.auth.tenant.id));
  }),
);

const articleQuerySchema = z.object({ search: z.string().trim().max(200).optional() });

supportRoutes.get(
  '/articles',
  requirePermission('support:read'),
  authedHandler(async (req, res) => {
    const { search } = articleQuerySchema.parse(req.query);
    res.json({ data: await supportService.listArticles(search) });
  }),
);

supportRoutes.get(
  '/articles/:slug',
  requirePermission('support:read'),
  authedHandler(async (req, res) => {
    res.json(await supportService.getArticle(String(req.params.slug)));
  }),
);

supportRoutes.get(
  '/tickets',
  requirePermission('support:read'),
  authedHandler(async (req, res) => {
    const query = ticketListQuerySchema.parse(req.query);
    res.json(await supportService.listTickets(req.auth.tenant.id, query));
  }),
);

supportRoutes.post(
  '/tickets',
  requirePermission('support:write'),
  authedHandler(async (req, res) => {
    const input = ticketCreateSchema.parse(req.body);
    res.status(201).json(await supportService.createTicket(req.auth.tenant.id, input, req.auth.user));
  }),
);

supportRoutes.get(
  '/tickets/:id',
  requirePermission('support:read'),
  authedHandler(async (req, res) => {
    res.json(await supportService.getTicket(req.auth.tenant.id, String(req.params.id)));
  }),
);

supportRoutes.post(
  '/tickets/:id/reply',
  requirePermission('support:write'),
  authedHandler(async (req, res) => {
    const input = ticketReplySchema.parse(req.body);
    res.json(
      await supportService.reply(req.auth.tenant.id, String(req.params.id), input, req.auth.user),
    );
  }),
);

supportRoutes.post(
  '/tickets/:id/close',
  requirePermission('support:write'),
  authedHandler(async (req, res) => {
    res.json(await supportService.closeTicket(req.auth.tenant.id, String(req.params.id)));
  }),
);
