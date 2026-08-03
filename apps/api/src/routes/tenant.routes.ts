import { tenantBrandingUpdateSchema } from '@peppermill/shared';
import { Router } from 'express';

import { asyncHandler, authedHandler } from '../middleware/async-handler.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { tenantService } from '../services/tenant.service.js';

export const tenantRoutes = Router();

/**
 * Public tenant list.
 *
 * Deliberately unauthenticated and limited to `TenantSummary`, because the
 * login screen has to render a brand before anyone has signed in.
 */
tenantRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await tenantService.list() });
  }),
);

/** Public branding lookup — the client themes the login screen from this. */
tenantRoutes.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.json(await tenantService.getBySlug(String(req.params.slug)));
  }),
);

tenantRoutes.patch(
  '/current/branding',
  requireAuth,
  requirePermission('branding:write'),
  authedHandler(async (req, res) => {
    const patch = tenantBrandingUpdateSchema.parse(req.body);
    res.json(await tenantService.updateBranding(req.auth.tenant.id, patch));
  }),
);
