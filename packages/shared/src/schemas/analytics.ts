import { z } from 'zod';
import { moneySchema, timeSeriesPointSchema, trendSchema } from './common.js';
import { cardBrandSchema, reasonCategorySchema } from './case.js';

/** Reporting windows offered by the analytics date picker. */
export const analyticsRangeSchema = z.enum(['7d', '30d', '90d', '12m']);
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

export const analyticsQuerySchema = z.object({
  range: analyticsRangeSchema.default('30d'),
  cardBrand: cardBrandSchema.optional(),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/**
 * A single headline metric. `delta` is the fractional change against the
 * preceding window of equal length, and `trend` states whether that movement
 * is good or bad — a rising win rate and a rising chargeback count point in
 * opposite directions, so the sign alone is not enough to colour the tile.
 */
export const kpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  /** Controls client-side formatting without leaking display logic to the UI. */
  format: z.enum(['currency', 'percent', 'number']),
  currency: z.string().optional(),
  delta: z.number(),
  trend: trendSchema,
  /** True when an increase in this metric is a good outcome. */
  higherIsBetter: z.boolean(),
  caption: z.string(),
});
export type Kpi = z.infer<typeof kpiSchema>;

export const reasonBreakdownItemSchema = z.object({
  category: reasonCategorySchema,
  label: z.string(),
  count: z.number().int(),
  amount: moneySchema,
  winRate: z.number(),
  share: z.number(),
});
export type ReasonBreakdownItem = z.infer<typeof reasonBreakdownItemSchema>;

export const cardBrandBreakdownItemSchema = z.object({
  cardBrand: cardBrandSchema,
  label: z.string(),
  count: z.number().int(),
  amount: moneySchema,
  winRate: z.number(),
  /** Chargebacks divided by transactions for this brand in the window. */
  ratio: z.number(),
  threshold: z.number(),
  thresholdProgramme: z.string(),
});
export type CardBrandBreakdownItem = z.infer<typeof cardBrandBreakdownItemSchema>;

export const reasonCodeLeaderSchema = z.object({
  code: z.string(),
  title: z.string(),
  cardBrand: cardBrandSchema,
  count: z.number().int(),
  amount: moneySchema,
  winRate: z.number(),
});
export type ReasonCodeLeader = z.infer<typeof reasonCodeLeaderSchema>;

export const analyticsOverviewSchema = z.object({
  range: analyticsRangeSchema,
  generatedAt: z.string(),
  kpis: z.array(kpiSchema),
  /** Chargeback volume over time, split so the chart can stack won vs lost. */
  volumeSeries: z.array(
    z.object({
      date: z.string(),
      chargebacks: z.number(),
      won: z.number(),
      lost: z.number(),
    }),
  ),
  winRateSeries: z.array(timeSeriesPointSchema),
  /** Disputed value recovered per period, in minor units. */
  recoverySeries: z.array(timeSeriesPointSchema),
  ratioSeries: z.array(timeSeriesPointSchema),
  reasonBreakdown: z.array(reasonBreakdownItemSchema),
  cardBrandBreakdown: z.array(cardBrandBreakdownItemSchema),
  topReasonCodes: z.array(reasonCodeLeaderSchema),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

/* ------------------------------------------------------------------ */
/* Saved reports and exports                                           */
/* ------------------------------------------------------------------ */

export const reportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);
export type ReportFormat = z.infer<typeof reportFormatSchema>;

export const reportScheduleSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);
export type ReportSchedule = z.infer<typeof reportScheduleSchema>;

export const savedReportSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string(),
  dataset: z.enum(['cases', 'alerts', 'recovery', 'ratio']),
  range: analyticsRangeSchema,
  format: reportFormatSchema,
  schedule: reportScheduleSchema,
  recipients: z.array(z.string()),
  lastRunAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type SavedReport = z.infer<typeof savedReportSchema>;

export const savedReportCreateSchema = z.object({
  name: z.string().min(2, 'Give the report a name'),
  description: z.string().default(''),
  dataset: z.enum(['cases', 'alerts', 'recovery', 'ratio']),
  range: analyticsRangeSchema.default('30d'),
  format: reportFormatSchema.default('csv'),
  schedule: reportScheduleSchema.default('none'),
  recipients: z.array(z.string().email()).default([]),
});
export type SavedReportCreate = z.infer<typeof savedReportCreateSchema>;
