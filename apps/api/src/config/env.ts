import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment parsing.
 *
 * Validating once at boot means the rest of the codebase reads a typed object
 * instead of poking at `process.env`, and a missing or malformed variable
 * fails the process immediately rather than at the first request that needs it.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_SECRET: z.string().min(8).default('peppermill-demo-secret-change-me'),
  AUTH_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(720),
  /** Selects the repository implementation registered in `repositories/index.ts`. */
  DATA_DRIVER: z.enum(['json']).default('json'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/** CORS accepts a comma-separated list so preview deployments can be added. */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
