import type { Tenant, User } from '@peppermill/shared';
import type { Request } from 'express';

/**
 * Authenticated request.
 *
 * `auth` is attached by `requireAuth` and is non-optional here, so any handler
 * typed against this interface is guaranteed by the compiler to sit behind the
 * authentication middleware.
 */
export interface AuthedRequest extends Request {
  auth: {
    user: User;
    tenant: Tenant;
  };
}
