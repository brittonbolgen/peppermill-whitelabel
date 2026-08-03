import type {
  Alert,
  AlertBulkResolve,
  AlertListQuery,
  AlertResolution,
  AlertResolve,
  AlertStats,
  AlertStatus,
  Currency,
  Paginated,
  User,
} from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { hoursUntil, toIso } from '../utils/dates.js';
import { paginate, searchItems, sortItems } from '../utils/pagination.js';

const SEARCH_FIELDS = ['alertRef', 'orderId', 'customerName', 'customerEmail', 'descriptor'];

/** Alerts inside this window are surfaced as urgent in the queue. */
const EXPIRING_SOON_HOURS = 24;

const RESOLUTION_STATUS: Record<AlertResolution, AlertStatus> = {
  refund: 'refunded',
  accept: 'accepted',
  decline: 'declined',
};

const RESOLUTION_OUTCOME: Record<AlertResolution, string> = {
  refund: 'Refunded in full before the dispute was raised.',
  accept: 'Liability accepted; chargeback expected and will be fought.',
  decline: 'Alert declined — order verified as legitimate.',
};

export const alertService = {
  async list(tenantId: string, query: AlertListQuery): Promise<Paginated<Alert>> {
    const all = await repositories.alerts.listByTenant(tenantId);

    let filtered = all.filter((item) => {
      if (query.status && item.status !== query.status) return false;
      if (query.network && item.network !== query.network) return false;
      if (query.type && item.type !== query.type) return false;
      if (query.cardBrand && item.cardBrand !== query.cardBrand) return false;
      if (query.expiringSoon) {
        if (item.status !== 'pending') return false;
        const hours = hoursUntil(item.expiresAt);
        if (hours <= 0 || hours > EXPIRING_SOON_HOURS) return false;
      }
      return true;
    });

    filtered = searchItems(filtered, query.search, SEARCH_FIELDS);

    // Pending alerts are ordered by how soon they lapse rather than by age,
    // because time remaining is the only thing that decides what to work next.
    if (!query.sort && query.status === 'pending') {
      filtered = [...filtered].sort(
        (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
      );
    } else {
      filtered = sortItems(filtered, query.sort ?? 'receivedAt', query.order);
    }

    return paginate(filtered, query);
  },

  async getById(tenantId: string, id: string): Promise<Alert> {
    const alert = await repositories.alerts.findById(tenantId, id);
    if (!alert) throw new NotFoundError('Alert');
    return alert;
  },

  async resolve(tenantId: string, id: string, input: AlertResolve, actor: User): Promise<Alert> {
    const alert = await this.getById(tenantId, id);

    if (alert.status !== 'pending') {
      throw new BadRequestError('This alert has already been resolved');
    }
    if (hoursUntil(alert.expiresAt) <= 0) {
      throw new BadRequestError('This alert has expired and can no longer be actioned');
    }

    const status = RESOLUTION_STATUS[input.resolution];

    return repositories.alerts.update(tenantId, id, {
      status,
      resolvedAt: toIso(new Date()),
      resolvedBy: actor.name,
      outcome: input.note.trim() || RESOLUTION_OUTCOME[input.resolution],
      // Accepting liability does not deflect anything, so no value is avoided.
      avoidedAmount:
        input.resolution === 'accept'
          ? null
          : { amount: alert.amount.amount + 2_500, currency: alert.amount.currency },
    });
  },

  /**
   * Bulk resolution reports per-alert outcomes instead of failing the whole
   * batch — a queue selection will often include one alert that lapsed while
   * the user was choosing, and that should not discard the other twenty.
   */
  async bulkResolve(
    tenantId: string,
    input: AlertBulkResolve,
    actor: User,
  ): Promise<{ resolved: string[]; failed: { id: string; reason: string }[] }> {
    const resolved: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of input.alertIds) {
      try {
        await this.resolve(tenantId, id, { resolution: input.resolution, note: input.note }, actor);
        resolved.push(id);
      } catch (error) {
        failed.push({
          id,
          reason: error instanceof Error ? error.message : 'Could not resolve this alert',
        });
      }
    }

    return { resolved, failed };
  },

  async stats(tenantId: string): Promise<AlertStats> {
    const all = await repositories.alerts.listByTenant(tenantId);
    const currency = (all[0]?.amount.currency ?? 'USD') as Currency;

    const pending = all.filter((a) => a.status === 'pending');
    const expiringSoon = pending.filter((a) => {
      const hours = hoursUntil(a.expiresAt);
      return hours > 0 && hours <= EXPIRING_SOON_HOURS;
    });

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const resolvedThisMonth = all.filter(
      (a) => a.resolvedAt && new Date(a.resolvedAt) >= monthStart,
    );

    // Deflection rate counts only alerts that reached a terminal state, so a
    // large pending backlog does not artificially depress the figure.
    const closed = all.filter((a) => a.status !== 'pending');
    const deflected = closed.filter((a) => a.status === 'refunded' || a.status === 'declined');

    return {
      pending: pending.length,
      expiringSoon: expiringSoon.length,
      resolvedThisMonth: resolvedThisMonth.length,
      deflectionRate: closed.length === 0 ? 0 : deflected.length / closed.length,
      avoidedAmount: {
        amount: all.reduce((sum, a) => sum + (a.avoidedAmount?.amount ?? 0), 0),
        currency,
      },
      refundedAmount: {
        amount: all
          .filter((a) => a.status === 'refunded')
          .reduce((sum, a) => sum + a.amount.amount, 0),
        currency,
      },
    };
  },
};
