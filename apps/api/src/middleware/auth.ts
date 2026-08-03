import type { Permission } from '@peppermill/shared';
import { roleCan } from '@peppermill/shared';
import type { NextFunction, RequestHandler, Request, Response } from 'express';

import { authService } from '../services/auth.service.js';
import { tenantService } from '../services/tenant.service.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { AuthedRequest } from './types.js';

/**
 * Resolves the bearer token and attaches the user and their tenant.
 *
 * The tenant comes from the token, never from a client-supplied header. An
 * `X-Tenant-Id` that disagreed with the session would otherwise be a
 * straightforward path to reading another brand's data.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Sign in to continue'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  authService
    .resolveSession(token)
    .then(async ({ user, tenantId }) => {
      const tenant = await tenantService.getById(tenantId);
      (req as AuthedRequest).auth = { user, tenant };
      next();
    })
    .catch(next);
};

/** Guards a route on a single permission from the role matrix. */
export function requirePermission(permission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as AuthedRequest).auth;

    if (!auth) {
      next(new UnauthorizedError('Sign in to continue'));
      return;
    }

    if (!roleCan(auth.user.role, permission)) {
      next(new ForbiddenError('Your role does not allow this action'));
      return;
    }

    next();
  };
}

/**
 * Guards a route on a tenant feature flag, so a disabled section returns 404
 * at the API rather than relying on the client hiding its navigation entry.
 */
export function requireFeature(
  feature: keyof import('@peppermill/shared').TenantFeatures,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const auth = (req as AuthedRequest).auth;

    if (!auth?.tenant.features[feature]) {
      next(new ForbiddenError('This feature is not enabled for your workspace'));
      return;
    }

    next();
  };
}
