import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const notificationCategorySchema = z.enum([
  'case',
  'alert',
  'deadline',
  'report',
  'system',
  'security',
]);
export type NotificationCategory = z.infer<typeof notificationCategorySchema>;

export const notificationSeveritySchema = z.enum(['info', 'success', 'warning', 'critical']);
export type NotificationSeverity = z.infer<typeof notificationSeveritySchema>;

export const notificationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  category: notificationCategorySchema,
  severity: notificationSeveritySchema,
  title: z.string(),
  body: z.string(),
  /** In-app route the notification deep-links to, if any. */
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListQuerySchema = paginationQuerySchema.extend({
  category: notificationCategorySchema.optional(),
  severity: notificationSeveritySchema.optional(),
  unreadOnly: z.coerce.boolean().optional(),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/**
 * Delivery preferences.
 *
 * Held per channel per category so a tenant can, for example, take deadline
 * warnings by SMS while keeping report digests to email only.
 */
export const notificationChannelSchema = z.enum(['inApp', 'email', 'sms', 'webhook']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const notificationPreferenceSchema = z.object({
  category: notificationCategorySchema,
  label: z.string(),
  description: z.string(),
  inApp: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  webhook: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const notificationPreferencesSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  preferences: z.array(notificationPreferenceSchema),
  /** Quiet hours suppress non-critical delivery. */
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
  digestFrequency: z.enum(['off', 'daily', 'weekly']),
  webhookUrl: z.string(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const notificationPreferencesUpdateSchema = z.object({
  preferences: z.array(notificationPreferenceSchema).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  digestFrequency: z.enum(['off', 'daily', 'weekly']).optional(),
  webhookUrl: z.string().optional(),
});
export type NotificationPreferencesUpdate = z.infer<typeof notificationPreferencesUpdateSchema>;

export const notificationStatsSchema = z.object({
  total: z.number().int(),
  unread: z.number().int(),
  critical: z.number().int(),
});
export type NotificationStats = z.infer<typeof notificationStatsSchema>;
