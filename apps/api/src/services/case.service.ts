import {
  REASON_CATEGORY_META,
  type CaseListQuery,
  type CaseStats,
  type CaseSummary,
  type CaseUpdate,
  type Currency,
  type DisputeCase,
  type Evidence,
  type EvidenceCreate,
  type Paginated,
  type RepresentmentSubmit,
  type TimelineEvent,
  type User,
} from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { hoursUntil, toIso } from '../utils/dates.js';
import { paginate, searchItems, sortItems } from '../utils/pagination.js';

/** Statuses that represent outstanding merchant work. */
const ACTION_STATUSES = new Set(['new', 'evidence_required']);

const SEARCH_FIELDS = [
  'caseNumber',
  'orderId',
  'customer.name',
  'customer.email',
  'productName',
  'reasonCode',
  'reasonTitle',
  'descriptor',
];

function toSummary(item: DisputeCase): CaseSummary {
  const { evidence: _evidence, timeline: _timeline, notes: _notes, ...summary } = item;
  return summary;
}

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function timelineEvent(
  type: TimelineEvent['type'],
  message: string,
  actor: User,
): TimelineEvent {
  return {
    id: nextId('tl'),
    type,
    message,
    actor: actor.name,
    actorType: 'user',
    createdAt: toIso(new Date()),
  };
}

export const caseService = {
  async list(tenantId: string, query: CaseListQuery): Promise<Paginated<CaseSummary>> {
    const all = await repositories.cases.listByTenant(tenantId);

    const statuses = query.status
      ? new Set(Array.isArray(query.status) ? query.status : [query.status])
      : null;

    let filtered = all.filter((item) => {
      if (statuses && !statuses.has(item.status)) return false;
      if (query.stage && item.stage !== query.stage) return false;
      if (query.cardBrand && item.cardBrand !== query.cardBrand) return false;
      if (query.reasonCategory && item.reasonCategory !== query.reasonCategory) return false;
      if (query.priority && item.priority !== query.priority) return false;
      if (query.assignedToId && item.assignedToId !== query.assignedToId) return false;
      if (query.needsAction && !ACTION_STATUSES.has(item.status)) return false;
      if (query.from && item.chargebackDate < query.from) return false;
      if (query.to && item.chargebackDate > query.to) return false;
      return true;
    });

    filtered = searchItems(filtered, query.search, SEARCH_FIELDS);
    // Newest first is the useful default for a dispute queue.
    filtered = sortItems(filtered, query.sort ?? 'chargebackDate', query.order);

    const page = paginate(filtered, query);
    return { data: page.data.map(toSummary), meta: page.meta };
  },

  async getById(tenantId: string, id: string): Promise<DisputeCase> {
    const item = await repositories.cases.findById(tenantId, id);
    if (!item) throw new NotFoundError('Case');
    return item;
  },

  async update(tenantId: string, id: string, patch: CaseUpdate, actor: User): Promise<DisputeCase> {
    const current = await this.getById(tenantId, id);
    const events: TimelineEvent[] = [];

    if (patch.status && patch.status !== current.status) {
      events.push(
        timelineEvent('status_changed', `Status changed to ${patch.status.replace(/_/g, ' ')}.`, actor),
      );
    }

    if (patch.assignedToId !== undefined && patch.assignedToId !== current.assignedToId) {
      const assignee = patch.assignedToId
        ? await repositories.users.findById(patch.assignedToId)
        : null;
      if (patch.assignedToId && !assignee) throw new BadRequestError('Unknown assignee');
      events.push(
        timelineEvent('assigned', assignee ? `Case assigned to ${assignee.name}.` : 'Case unassigned.', actor),
      );

      return repositories.cases.update(tenantId, id, {
        ...patch,
        assignedToName: assignee?.name ?? null,
        timeline: [...current.timeline, ...events],
        updatedAt: toIso(new Date()),
      });
    }

    if (patch.notes !== undefined && patch.notes !== current.notes) {
      events.push(timelineEvent('note_added', 'Internal note updated.', actor));
    }

    return repositories.cases.update(tenantId, id, {
      ...patch,
      timeline: [...current.timeline, ...events],
      updatedAt: toIso(new Date()),
    });
  },

  async addEvidence(
    tenantId: string,
    id: string,
    input: EvidenceCreate,
    actor: User,
  ): Promise<DisputeCase> {
    const current = await this.getById(tenantId, id);

    const evidence: Evidence = {
      id: nextId('ev'),
      type: input.type,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedAt: toIso(new Date()),
      uploadedBy: actor.name,
      note: input.note,
    };

    return repositories.cases.update(tenantId, id, {
      evidence: [...current.evidence, evidence],
      timeline: [
        ...current.timeline,
        timelineEvent('evidence_added', `${input.fileName} attached to the case file.`, actor),
      ],
      updatedAt: toIso(new Date()),
    });
  },

  async removeEvidence(
    tenantId: string,
    id: string,
    evidenceId: string,
    actor: User,
  ): Promise<DisputeCase> {
    const current = await this.getById(tenantId, id);
    const target = current.evidence.find((e) => e.id === evidenceId);
    if (!target) throw new NotFoundError('Evidence');

    return repositories.cases.update(tenantId, id, {
      evidence: current.evidence.filter((e) => e.id !== evidenceId),
      timeline: [
        ...current.timeline,
        timelineEvent('evidence_removed', `${target.fileName} removed from the case file.`, actor),
      ],
      updatedAt: toIso(new Date()),
    });
  },

  async submitRepresentment(
    tenantId: string,
    id: string,
    input: RepresentmentSubmit,
    actor: User,
  ): Promise<DisputeCase> {
    const current = await this.getById(tenantId, id);

    if (['submitted', 'won', 'lost', 'expired'].includes(current.status)) {
      throw new BadRequestError('This case has already been submitted or closed');
    }

    if (input.acceptLiability) {
      return repositories.cases.update(tenantId, id, {
        status: 'accepted',
        timeline: [
          ...current.timeline,
          timelineEvent('status_changed', 'Merchant accepted liability without representment.', actor),
        ],
        updatedAt: toIso(new Date()),
      });
    }

    const known = new Set(current.evidence.map((e) => e.id));
    const missing = input.evidenceIds.filter((evidenceId) => !known.has(evidenceId));
    if (missing.length > 0) {
      throw new BadRequestError('The packet references documents that are not on this case');
    }

    if (hoursUntil(current.respondBy) <= 0) {
      throw new BadRequestError('The response window for this case has already closed');
    }

    return repositories.cases.update(tenantId, id, {
      status: 'submitted',
      notes: input.rebuttalLetter,
      timeline: [
        ...current.timeline,
        timelineEvent(
          'representment_submitted',
          `Representment submitted with ${input.evidenceIds.length} document(s) attached.`,
          actor,
        ),
      ],
      updatedAt: toIso(new Date()),
    });
  },

  /** Evidence checklist for the representment builder, keyed off the reason category. */
  async recommendedEvidence(tenantId: string, id: string): Promise<string[]> {
    const item = await this.getById(tenantId, id);
    return [...REASON_CATEGORY_META[item.reasonCategory].recommendedEvidence];
  },

  async stats(tenantId: string): Promise<CaseStats> {
    const all = await repositories.cases.listByTenant(tenantId);
    const currency = (all[0]?.disputedAmount.currency ?? 'USD') as Currency;

    const needsAction = all.filter((c) => ACTION_STATUSES.has(c.status));
    const open = all.filter((c) => !['won', 'lost', 'accepted', 'expired'].includes(c.status));
    const won = all.filter((c) => c.status === 'won');
    const lost = all.filter((c) => c.status === 'lost');
    const submitted = all.filter((c) => c.status === 'submitted');

    const dueWithin48h = open.filter((c) => {
      const hours = hoursUntil(c.respondBy);
      return hours > 0 && hours <= 48;
    });

    // Win rate is measured against decided cases only — counting cases still
    // in flight would drag the figure down for no reason.
    const decided = won.length + lost.length;

    return {
      total: all.length,
      needsAction: needsAction.length,
      dueWithin48h: dueWithin48h.length,
      submitted: submitted.length,
      won: won.length,
      lost: lost.length,
      winRate: decided === 0 ? 0 : won.length / decided,
      atRiskAmount: {
        amount: open.reduce((sum, c) => sum + c.disputedAmount.amount, 0),
        currency,
      },
      recoveredAmount: {
        amount: won.reduce((sum, c) => sum + c.disputedAmount.amount, 0),
        currency,
      },
    };
  },
};
