import { ROLES, paginationQuerySchema, userCreateSchema, userUpdateSchema } from '@peppermill/shared';
import { Router } from 'express';

import { authedHandler } from '../middleware/async-handler.js';
import { requireFeature, requirePermission } from '../middleware/auth.js';
import { userService } from '../services/user.service.js';

export const userRoutes = Router();

userRoutes.use(requireFeature('userManagement'));

userRoutes.get(
  '/',
  requirePermission('users:read'),
  authedHandler(async (req, res) => {
    const query = paginationQuerySchema.parse(req.query);
    res.json(await userService.list(req.auth.tenant.id, query));
  }),
);

/** The role matrix, so the client renders permissions from one source. */
userRoutes.get('/roles', requirePermission('users:read'), (_req, res) => {
  res.json({ data: Object.values(ROLES) });
});

userRoutes.get(
  '/:id',
  requirePermission('users:read'),
  authedHandler(async (req, res) => {
    res.json(await userService.getById(req.auth.tenant.id, String(req.params.id)));
  }),
);

userRoutes.post(
  '/',
  requirePermission('users:write'),
  authedHandler(async (req, res) => {
    const input = userCreateSchema.parse(req.body);
    res.status(201).json(await userService.create(req.auth.tenant.id, input));
  }),
);

userRoutes.patch(
  '/:id',
  requirePermission('users:write'),
  authedHandler(async (req, res) => {
    const patch = userUpdateSchema.parse(req.body);
    res.json(await userService.update(req.auth.tenant.id, String(req.params.id), patch, req.auth.user));
  }),
);

userRoutes.delete(
  '/:id',
  requirePermission('users:write'),
  authedHandler(async (req, res) => {
    await userService.remove(req.auth.tenant.id, String(req.params.id), req.auth.user);
    res.status(204).end();
  }),
);
