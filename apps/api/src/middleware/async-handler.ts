import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { AuthedRequest } from './types.js';

/**
 * Wraps an async handler so a rejected promise reaches the error middleware.
 *
 * Express 4 does not forward async rejections to `next`, which would otherwise
 * leave a failed request hanging until it timed out.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Same wrapper for handlers that require an authenticated request. */
export function authedHandler(
  handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as AuthedRequest, res, next).catch(next);
  };
}
