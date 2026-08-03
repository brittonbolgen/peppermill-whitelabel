import type { RequestHandler } from 'express';

/** Single-line request log with status and duration. */
export const requestLog: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const status = res.statusCode;
    const marker = status >= 500 ? '✗' : status >= 400 ? '!' : '✓';
    console.log(
      `${marker} ${req.method.padEnd(6)} ${String(status)} ${req.originalUrl} ${durationMs.toFixed(1)}ms`,
    );
  });

  next();
};
