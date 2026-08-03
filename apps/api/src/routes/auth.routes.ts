import { loginRequestSchema } from '@peppermill/shared';
import { Router } from 'express';

import { asyncHandler, authedHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { authService } from '../services/auth.service.js';

export const authRoutes = Router();

authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginRequestSchema.parse(req.body);
    const session = await authService.login(input);
    res.json(session);
  }),
);

/** Returns the signed-in user together with the tenant their session belongs to. */
authRoutes.get(
  '/me',
  requireAuth,
  authedHandler(async (req, res) => {
    res.json({ user: req.auth.user, tenant: req.auth.tenant });
  }),
);

/**
 * Sessions are stateless, so signing out is a client-side token discard. The
 * endpoint exists so the client has one place to call, and so a future
 * revocation list has somewhere to live.
 */
authRoutes.post('/logout', requireAuth, (_req, res) => {
  res.status(204).end();
});
