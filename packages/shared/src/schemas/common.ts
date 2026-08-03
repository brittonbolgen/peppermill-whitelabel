import { z } from 'zod';

/** ISO-4217 currency codes the demo data set uses. */
export const currencySchema = z.enum(['USD', 'GBP', 'EUR', 'CAD', 'AUD']);
export type Currency = z.infer<typeof currencySchema>;

/**
 * Monetary amounts are carried as integer minor units (cents/pence) so that
 * no value is ever subject to floating point drift in transit. Formatting to
 * a display string happens once, at the edge, via `formatMoney`.
 */
export const moneySchema = z.object({
  amount: z.number().int(),
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

/** Query parameters accepted by every collection endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(200).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const pageMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;

/**
 * Every collection response has this shape. Building it as a generic factory
 * keeps the envelope identical across resources while preserving item types.
 */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: pageMetaSchema,
  });
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Uniform error body returned by the API for every non-2xx response. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const idSchema = z.string().min(1);

/** A single point in a time series, used across the analytics surfaces. */
export const timeSeriesPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});
export type TimeSeriesPoint = z.infer<typeof timeSeriesPointSchema>;

/** Direction of travel for a KPI, so the UI can colour deltas consistently. */
export const trendSchema = z.enum(['up', 'down', 'flat']);
export type Trend = z.infer<typeof trendSchema>;
