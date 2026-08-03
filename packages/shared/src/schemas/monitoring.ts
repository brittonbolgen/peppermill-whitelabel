import { z } from 'zod';
import { timeSeriesPointSchema } from './common.js';

/**
 * Platform monitoring.
 *
 * Covers the health of the integrations the portal depends on — the acquirer
 * feed, the deflection networks, the payment gateway — plus the ingestion jobs
 * that keep case data current. A merchant seeing stale numbers needs to know
 * whether the data is wrong or simply late.
 */

export const serviceStatusSchema = z.enum(['operational', 'degraded', 'outage', 'maintenance']);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['acquirer', 'gateway', 'deflection', 'crm', 'storage', 'internal']),
  status: serviceStatusSchema,
  /** Round-trip latency of the last health probe, in milliseconds. */
  latencyMs: z.number().int(),
  uptime30d: z.number(),
  lastSyncedAt: z.string(),
  /** Records pulled in the most recent successful sync. */
  lastSyncRecords: z.number().int(),
  message: z.string(),
});
export type Integration = z.infer<typeof integrationSchema>;

export const syncJobStatusSchema = z.enum(['success', 'running', 'failed', 'queued']);
export type SyncJobStatus = z.infer<typeof syncJobStatusSchema>;

export const syncJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  integrationId: z.string(),
  status: syncJobStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  recordsProcessed: z.number().int(),
  recordsFailed: z.number().int(),
  /** Cron expression governing the next run. */
  schedule: z.string(),
  nextRunAt: z.string(),
  error: z.string().nullable(),
});
export type SyncJob = z.infer<typeof syncJobSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  severity: z.enum(['minor', 'major', 'critical']),
  affectedServices: z.array(z.string()),
  startedAt: z.string(),
  resolvedAt: z.string().nullable(),
  updates: z.array(
    z.object({
      id: z.string(),
      message: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type Incident = z.infer<typeof incidentSchema>;

export const apiUsageSchema = z.object({
  /** Calls made in the current billing period. */
  callsThisPeriod: z.number().int(),
  quota: z.number().int(),
  errorRate: z.number(),
  p95LatencyMs: z.number().int(),
  series: z.array(timeSeriesPointSchema),
});
export type ApiUsage = z.infer<typeof apiUsageSchema>;

export const monitoringOverviewSchema = z.object({
  overallStatus: serviceStatusSchema,
  generatedAt: z.string(),
  integrations: z.array(integrationSchema),
  syncJobs: z.array(syncJobSchema),
  incidents: z.array(incidentSchema),
  apiUsage: apiUsageSchema,
  /** Portal availability over the trailing 30 days, one point per day. */
  uptimeSeries: z.array(timeSeriesPointSchema),
});
export type MonitoringOverview = z.infer<typeof monitoringOverviewSchema>;
