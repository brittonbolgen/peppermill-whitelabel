import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const ticketStatusSchema = z.enum(['open', 'pending', 'resolved', 'closed']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const ticketCategorySchema = z.enum([
  'dispute_help',
  'integration',
  'billing',
  'reporting',
  'account',
  'other',
]);
export type TicketCategory = z.infer<typeof ticketCategorySchema>;

export const ticketMessageSchema = z.object({
  id: z.string(),
  author: z.string(),
  /** Separates merchant replies from Chargebacks911 support responses. */
  authorType: z.enum(['merchant', 'support']),
  body: z.string(),
  createdAt: z.string(),
});
export type TicketMessage = z.infer<typeof ticketMessageSchema>;

export const supportTicketSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  ticketNumber: z.string(),
  subject: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  category: ticketCategorySchema,
  /** Set when the ticket was raised from a specific dispute. */
  relatedCaseId: z.string().nullable(),
  requesterName: z.string(),
  requesterEmail: z.string(),
  assigneeName: z.string().nullable(),
  messages: z.array(ticketMessageSchema),
  /** Contractual first-response target for the tenant's plan. */
  slaResponseHours: z.number().int(),
  firstRespondedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupportTicket = z.infer<typeof supportTicketSchema>;

export const ticketListQuerySchema = paginationQuerySchema.extend({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

export const ticketCreateSchema = z.object({
  subject: z.string().min(4, 'Add a short subject'),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema.default('normal'),
  body: z.string().min(20, 'Describe the issue in a little more detail'),
  relatedCaseId: z.string().nullable().default(null),
});
export type TicketCreate = z.infer<typeof ticketCreateSchema>;

export const ticketReplySchema = z.object({
  body: z.string().min(1, 'Write a reply'),
});
export type TicketReply = z.infer<typeof ticketReplySchema>;

/* ------------------------------------------------------------------ */
/* Knowledge base                                                      */
/* ------------------------------------------------------------------ */

export const helpArticleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  readMinutes: z.number().int(),
  body: z.string(),
  updatedAt: z.string(),
});
export type HelpArticle = z.infer<typeof helpArticleSchema>;

export const supportOverviewSchema = z.object({
  openTickets: z.number().int(),
  pendingTickets: z.number().int(),
  /** Median first-response time over the trailing 30 days. */
  avgFirstResponseHours: z.number(),
  satisfactionScore: z.number(),
  accountManager: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    timezone: z.string(),
  }),
});
export type SupportOverview = z.infer<typeof supportOverviewSchema>;
