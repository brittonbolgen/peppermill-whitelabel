import { z } from 'zod';
import { moneySchema, paginationQuerySchema } from './common.js';
import { cardBrandSchema } from './case.js';

/**
 * Prevention alerts.
 *
 * These arrive from the deflection networks before a dispute becomes a
 * chargeback. Resolving one inside its SLA window stops the chargeback from
 * being raised at all, which is why every row carries a countdown.
 */

export const alertNetworkSchema = z.enum(['ethoca', 'rdr', 'cdrn']);
export type AlertNetwork = z.infer<typeof alertNetworkSchema>;

export const alertStatusSchema = z.enum([
  'pending',
  'refunded',
  'accepted',
  'declined',
  'expired',
]);
export type AlertStatus = z.infer<typeof alertStatusSchema>;

export const alertTypeSchema = z.enum(['fraud', 'customer_dispute', 'inquiry']);
export type AlertType = z.infer<typeof alertTypeSchema>;

export const alertSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  alertRef: z.string(),
  network: alertNetworkSchema,
  type: alertTypeSchema,
  status: alertStatusSchema,
  amount: moneySchema,
  cardBrand: cardBrandSchema,
  cardLast4: z.string().length(4),
  descriptor: z.string(),
  orderId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  transactionDate: z.string(),
  receivedAt: z.string(),
  /** Hard SLA. After this the alert lapses and a chargeback follows. */
  expiresAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  /** Populated once resolved, so the queue can report avoided liability. */
  outcome: z.string().nullable(),
  /** Chargeback value avoided by resolving in time. */
  avoidedAmount: moneySchema.nullable(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;

export const alertListQuerySchema = paginationQuerySchema.extend({
  status: alertStatusSchema.optional(),
  network: alertNetworkSchema.optional(),
  type: alertTypeSchema.optional(),
  cardBrand: cardBrandSchema.optional(),
  /** Filters to alerts whose SLA expires inside the next 24 hours. */
  expiringSoon: z.coerce.boolean().optional(),
});
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;

export const alertResolutionSchema = z.enum(['refund', 'accept', 'decline']);
export type AlertResolution = z.infer<typeof alertResolutionSchema>;

export const alertResolveSchema = z.object({
  resolution: alertResolutionSchema,
  note: z.string().default(''),
});
export type AlertResolve = z.infer<typeof alertResolveSchema>;

export const alertBulkResolveSchema = z.object({
  alertIds: z.array(z.string()).min(1, 'Select at least one alert'),
  resolution: alertResolutionSchema,
  note: z.string().default(''),
});
export type AlertBulkResolve = z.infer<typeof alertBulkResolveSchema>;

export const alertStatsSchema = z.object({
  pending: z.number().int(),
  expiringSoon: z.number().int(),
  resolvedThisMonth: z.number().int(),
  /** Share of alerts resolved before their SLA lapsed. */
  deflectionRate: z.number(),
  avoidedAmount: moneySchema,
  refundedAmount: moneySchema,
});
export type AlertStats = z.infer<typeof alertStatsSchema>;
