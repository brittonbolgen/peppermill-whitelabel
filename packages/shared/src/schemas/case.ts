import { z } from 'zod';
import { CARD_BRANDS } from '../constants/card-brands.js';
import { REASON_CATEGORIES } from '../constants/reason-codes.js';
import { moneySchema, paginationQuerySchema } from './common.js';

export const cardBrandSchema = z.enum(CARD_BRANDS);
export const reasonCategorySchema = z.enum(REASON_CATEGORIES);

/**
 * Case lifecycle.
 *
 * `new` and `evidence_required` are the two states that demand merchant
 * action, which is why the dashboard and the case list both surface them
 * as the "needs attention" bucket.
 */
export const caseStatusSchema = z.enum([
  'new',
  'under_review',
  'evidence_required',
  'submitted',
  'won',
  'lost',
  'accepted',
  'expired',
]);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

/** Where the dispute sits in the network's escalation path. */
export const caseStageSchema = z.enum([
  'retrieval',
  'first_chargeback',
  'pre_arbitration',
  'arbitration',
]);
export type CaseStage = z.infer<typeof caseStageSchema>;

export const casePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type CasePriority = z.infer<typeof casePrioritySchema>;

export const evidenceTypeSchema = z.enum([
  'proof_of_delivery',
  'invoice',
  'terms_accepted',
  'customer_correspondence',
  'avs_cvv_result',
  'device_fingerprint',
  'refund_proof',
  'authorization_log',
  'other',
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const evidenceSchema = z.object({
  id: z.string(),
  type: evidenceTypeSchema,
  fileName: z.string(),
  /** Bytes. Rendered via `formatBytes` in the UI. */
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string(),
  uploadedAt: z.string(),
  uploadedBy: z.string(),
  note: z.string().default(''),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const timelineEventTypeSchema = z.enum([
  'case_opened',
  'status_changed',
  'evidence_added',
  'evidence_removed',
  'note_added',
  'assigned',
  'representment_submitted',
  'network_response',
  'deadline_reminder',
]);
export type TimelineEventType = z.infer<typeof timelineEventTypeSchema>;

export const timelineEventSchema = z.object({
  id: z.string(),
  type: timelineEventTypeSchema,
  message: z.string(),
  actor: z.string(),
  /** Distinguishes merchant activity from automated network events. */
  actorType: z.enum(['user', 'system', 'network']),
  createdAt: z.string(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

export const customerSchema = z.object({
  name: z.string(),
  email: z.string(),
  cardLast4: z.string().length(4),
  country: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

export const disputeCaseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  /** Human-facing reference, e.g. "PM-2026-04812". */
  caseNumber: z.string(),
  status: caseStatusSchema,
  stage: caseStageSchema,
  priority: casePrioritySchema,
  disputedAmount: moneySchema,
  transactionAmount: moneySchema,
  cardBrand: cardBrandSchema,
  reasonCode: z.string(),
  reasonTitle: z.string(),
  reasonCategory: reasonCategorySchema,
  orderId: z.string(),
  /** The billing descriptor the cardholder saw on their statement. */
  descriptor: z.string(),
  productName: z.string(),
  customer: customerSchema,
  transactionDate: z.string(),
  chargebackDate: z.string(),
  /** Network deadline for the representment. Drives the SLA countdown. */
  respondBy: z.string(),
  assignedToId: z.string().nullable(),
  assignedToName: z.string().nullable(),
  /**
   * Model-scored probability of winning the representment, 0-100. Used to
   * rank the queue so agents spend their time on recoverable disputes.
   */
  recoveryLikelihood: z.number().int().min(0).max(100),
  evidence: z.array(evidenceSchema),
  timeline: z.array(timelineEventSchema),
  notes: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DisputeCase = z.infer<typeof disputeCaseSchema>;

/** Row shape for the case list — omits the heavy nested collections. */
export const caseSummarySchema = disputeCaseSchema.omit({
  evidence: true,
  timeline: true,
  notes: true,
});
export type CaseSummary = z.infer<typeof caseSummarySchema>;

export const caseListQuerySchema = paginationQuerySchema.extend({
  status: z.union([caseStatusSchema, z.array(caseStatusSchema)]).optional(),
  stage: caseStageSchema.optional(),
  cardBrand: cardBrandSchema.optional(),
  reasonCategory: reasonCategorySchema.optional(),
  priority: casePrioritySchema.optional(),
  assignedToId: z.string().optional(),
  /** ISO dates bounding `chargebackDate`. */
  from: z.string().optional(),
  to: z.string().optional(),
  /** Convenience filter for the dashboard's "needs attention" drill-down. */
  needsAction: z.coerce.boolean().optional(),
});
export type CaseListQuery = z.infer<typeof caseListQuerySchema>;

export const caseUpdateSchema = z.object({
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().optional(),
});
export type CaseUpdate = z.infer<typeof caseUpdateSchema>;

export const evidenceCreateSchema = z.object({
  type: evidenceTypeSchema,
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative().default(0),
  mimeType: z.string().default('application/pdf'),
  note: z.string().default(''),
});
export type EvidenceCreate = z.infer<typeof evidenceCreateSchema>;

export const representmentSubmitSchema = z.object({
  /** Evidence ids selected for the packet. */
  evidenceIds: z.array(z.string()).min(1, 'Attach at least one document'),
  rebuttalLetter: z.string().min(40, 'The rebuttal letter needs more detail'),
  /** Set when the merchant chooses to accept liability instead of fighting. */
  acceptLiability: z.boolean().default(false),
});
export type RepresentmentSubmit = z.infer<typeof representmentSubmitSchema>;

export const caseStatsSchema = z.object({
  total: z.number().int(),
  needsAction: z.number().int(),
  dueWithin48h: z.number().int(),
  submitted: z.number().int(),
  won: z.number().int(),
  lost: z.number().int(),
  winRate: z.number(),
  atRiskAmount: moneySchema,
  recoveredAmount: moneySchema,
});
export type CaseStats = z.infer<typeof caseStatsSchema>;
