import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { isProduction } from '../config/env.js';
import { AppError, NotFoundError } from '../utils/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
};

/**
 * Terminal error handler.
 *
 * Produces the single error envelope the client is written against, so the
 * front end has exactly one shape to parse regardless of what failed.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The submitted data is not valid',
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined && { details: error.details }),
      },
    });
    return;
  }

  // Anything reaching here is unintended. Log it in full, but never return the
  // internals to the client in production.
  console.error('Unhandled error:', error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : String(error) }),
    },
  });
};
