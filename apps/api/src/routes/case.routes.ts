import {
  caseListQuerySchema,
  caseUpdateSchema,
  evidenceCreateSchema,
  representmentSubmitSchema,
} from '@peppermill/shared';
import { Router } from 'express';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { caseService } from '../services/case.service.js';

export const caseRoutes = Router();

caseRoutes.use(requireFeature('cases'));

caseRoutes.get(
  '/',
  requirePermission('cases:read'),
  authedHandler(async (req, res) => {
    const query = caseListQuerySchema.parse(req.query);
    res.json(await caseService.list(req.auth.tenant.id, query));
  }),
);

caseRoutes.get(
  '/stats',
  requirePermission('cases:read'),
  authedHandler(async (req, res) => {
    res.json(await caseService.stats(req.auth.tenant.id));
  }),
);

caseRoutes.get(
  '/:id',
  requirePermission('cases:read'),
  authedHandler(async (req, res) => {
    res.json(await caseService.getById(req.auth.tenant.id, String(req.params.id)));
  }),
);

caseRoutes.get(
  '/:id/recommended-evidence',
  requirePermission('cases:read'),
  authedHandler(async (req, res) => {
    res.json({ data: await caseService.recommendedEvidence(req.auth.tenant.id, String(req.params.id)) });
  }),
);

caseRoutes.patch(
  '/:id',
  requirePermission('cases:write'),
  authedHandler(async (req, res) => {
    const patch = caseUpdateSchema.parse(req.body);
    res.json(await caseService.update(req.auth.tenant.id, String(req.params.id), patch, req.auth.user));
  }),
);

caseRoutes.post(
  '/:id/evidence',
  requirePermission('cases:write'),
  authedHandler(async (req, res) => {
    const input = evidenceCreateSchema.parse(req.body);
    res
      .status(201)
      .json(await caseService.addEvidence(req.auth.tenant.id, String(req.params.id), input, req.auth.user));
  }),
);

caseRoutes.delete(
  '/:id/evidence/:evidenceId',
  requirePermission('cases:write'),
  authedHandler(async (req, res) => {
    res.json(
      await caseService.removeEvidence(
        req.auth.tenant.id,
        String(req.params.id),
        String(req.params.evidenceId),
        req.auth.user,
      ),
    );
  }),
);

caseRoutes.post(
  '/:id/representment',
  requireFeature('representments'),
  requirePermission('cases:respond'),
  authedHandler(async (req, res) => {
    const input = representmentSubmitSchema.parse(req.body);
    res.json(
      await caseService.submitRepresentment(
        req.auth.tenant.id,
        String(req.params.id),
        input,
        req.auth.user,
      ),
    );
  }),
);
