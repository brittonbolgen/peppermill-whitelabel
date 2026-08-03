import {
  CARD_BRAND_META,
  REASON_CATEGORY_META,
  REASON_CODES,
  type AnalyticsOverview,
  type AnalyticsQuery,
  type CardBrand,
  type CardBrandBreakdownItem,
  type Currency,
  type DisputeCase,
  type Kpi,
  type ReasonBreakdownItem,
  type ReasonCategory,
  type ReasonCodeLeader,
  type SavedReport,
  type SavedReportCreate,
  type TimeSeriesPoint,
  type User,
} from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { addDays, dayKey, rangeToDays, startOfDay, toIso } from '../utils/dates.js';

/**
 * Analytics.
 *
 * Everything here is derived from the case and alert collections at request
 * time rather than stored as pre-aggregated counters. For a demo data set that
 * is the honest approach — the numbers can never disagree with the rows a user
 * can click through to. A production deployment would move these aggregations
 * into the database or a warehouse view behind the same service interface.
 */

/** Cases are decided rather than in flight — the only ones a win rate can use. */
const DECIDED = new Set(['won', 'lost']);

function isDecided(item: DisputeCase): boolean {
  return DECIDED.has(item.status);
}

function winRateOf(items: DisputeCase[]): number {
  const decided = items.filter(isDecided);
  if (decided.length === 0) return 0;
  return decided.filter((c) => c.status === 'won').length / decided.length;
}

/**
 * Approximate daily transaction volume.
 *
 * The demo has no order table, but a chargeback ratio is meaningless without a
 * denominator. This derives a stable, weekday-weighted transaction count from
 * the tenant id so the ratio series moves realistically instead of randomly.
 */
function transactionsOnDay(tenantId: string, date: Date): number {
  const base = tenantId === 'tenant_peppermill' ? 1_450 : tenantId === 'tenant_cb911' ? 2_300 : 900;
  const dayOfWeek = date.getUTCDay();
  // Retail dips at the weekend.
  const weekdayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.62 : 1;
  // A gentle annual seasonality curve so the 12-month view is not a flat line.
  const seasonal = 1 + 0.18 * Math.sin((date.getUTCMonth() / 12) * Math.PI * 2);
  return Math.round(base * weekdayFactor * seasonal);
}

interface Bucket {
  chargebacks: number;
  won: number;
  lost: number;
  recovered: number;
  transactions: number;
}

function bucketize(cases: DisputeCase[], from: Date, days: number, tenantId: string) {
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < days; i += 1) {
    const day = addDays(from, i);
    buckets.set(dayKey(day), {
      chargebacks: 0,
      won: 0,
      lost: 0,
      recovered: 0,
      transactions: transactionsOnDay(tenantId, day),
    });
  }

  for (const item of cases) {
    const key = item.chargebackDate.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.chargebacks += 1;
    if (item.status === 'won') {
      bucket.won += 1;
      bucket.recovered += item.disputedAmount.amount;
    }
    if (item.status === 'lost') bucket.lost += 1;
  }

  return buckets;
}

/**
 * Rolls daily buckets up to months once a range is long enough that a daily
 * chart would be unreadable.
 */
function rollUpToMonths(buckets: Map<string, Bucket>): Map<string, Bucket> {
  const months = new Map<string, Bucket>();

  for (const [day, bucket] of buckets) {
    const key = day.slice(0, 7);
    const existing = months.get(key);
    if (existing) {
      existing.chargebacks += bucket.chargebacks;
      existing.won += bucket.won;
      existing.lost += bucket.lost;
      existing.recovered += bucket.recovered;
      existing.transactions += bucket.transactions;
    } else {
      months.set(key, { ...bucket });
    }
  }

  return months;
}

function buildKpi(
  id: string,
  label: string,
  value: number,
  previous: number,
  format: Kpi['format'],
  higherIsBetter: boolean,
  caption: string,
  currency?: string,
): Kpi {
  // Guard the divide: a zero baseline would otherwise produce Infinity and
  // render as an absurd percentage on the tile.
  const delta = previous === 0 ? (value === 0 ? 0 : 1) : (value - previous) / Math.abs(previous);
  const trend: Kpi['trend'] = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down';

  return { id, label, value, format, currency, delta, trend, higherIsBetter, caption };
}

export const analyticsService = {
  async overview(tenantId: string, query: AnalyticsQuery): Promise<AnalyticsOverview> {
    const allCases = await repositories.cases.listByTenant(tenantId);
    const alerts = await repositories.alerts.listByTenant(tenantId);

    const scoped = query.cardBrand
      ? allCases.filter((c) => c.cardBrand === query.cardBrand)
      : allCases;

    const days = rangeToDays(query.range);
    const now = new Date();
    const from = startOfDay(addDays(now, -(days - 1)));
    const previousFrom = startOfDay(addDays(from, -days));

    const inRange = scoped.filter((c) => new Date(c.chargebackDate) >= from);
    const inPrevious = scoped.filter((c) => {
      const at = new Date(c.chargebackDate);
      return at >= previousFrom && at < from;
    });

    const currency = (allCases[0]?.disputedAmount.currency ?? 'USD') as Currency;

    /* ---------------- series ---------------- */

    const daily = bucketize(inRange, from, days, tenantId);
    // Beyond a quarter, daily points become noise rather than signal.
    const buckets = days > 90 ? rollUpToMonths(daily) : daily;

    const volumeSeries = [...buckets.entries()].map(([date, b]) => ({
      date,
      chargebacks: b.chargebacks,
      won: b.won,
      lost: b.lost,
    }));

    const winRateSeries: TimeSeriesPoint[] = [...buckets.entries()].map(([date, b]) => {
      const decided = b.won + b.lost;
      return { date, value: decided === 0 ? 0 : b.won / decided };
    });

    const recoverySeries: TimeSeriesPoint[] = [...buckets.entries()].map(([date, b]) => ({
      date,
      value: b.recovered,
    }));

    const ratioSeries: TimeSeriesPoint[] = [...buckets.entries()].map(([date, b]) => ({
      date,
      value: b.transactions === 0 ? 0 : b.chargebacks / b.transactions,
    }));

    /* ---------------- KPIs ---------------- */

    const recovered = inRange
      .filter((c) => c.status === 'won')
      .reduce((sum, c) => sum + c.disputedAmount.amount, 0);
    const previousRecovered = inPrevious
      .filter((c) => c.status === 'won')
      .reduce((sum, c) => sum + c.disputedAmount.amount, 0);

    const disputedValue = inRange.reduce((sum, c) => sum + c.disputedAmount.amount, 0);
    const previousDisputed = inPrevious.reduce((sum, c) => sum + c.disputedAmount.amount, 0);

    const totalTransactions = [...daily.values()].reduce((sum, b) => sum + b.transactions, 0);
    const ratio = totalTransactions === 0 ? 0 : inRange.length / totalTransactions;
    const previousTransactions = totalTransactions; // equal-length window
    const previousRatio =
      previousTransactions === 0 ? 0 : inPrevious.length / previousTransactions;

    const avoided = alerts
      .filter((a) => new Date(a.receivedAt) >= from)
      .reduce((sum, a) => sum + (a.avoidedAmount?.amount ?? 0), 0);
    const previousAvoided = alerts
      .filter((a) => {
        const at = new Date(a.receivedAt);
        return at >= previousFrom && at < from;
      })
      .reduce((sum, a) => sum + (a.avoidedAmount?.amount ?? 0), 0);

    const kpis: Kpi[] = [
      buildKpi(
        'chargebacks',
        'Chargebacks received',
        inRange.length,
        inPrevious.length,
        'number',
        false,
        'New disputes raised in this period',
      ),
      buildKpi(
        'winRate',
        'Win rate',
        winRateOf(inRange),
        winRateOf(inPrevious),
        'percent',
        true,
        'Share of decided representments won',
      ),
      buildKpi(
        'recovered',
        'Value recovered',
        recovered,
        previousRecovered,
        'currency',
        true,
        'Disputed funds returned after a successful representment',
        currency,
      ),
      buildKpi(
        'disputed',
        'Value disputed',
        disputedValue,
        previousDisputed,
        'currency',
        false,
        'Total value of disputes raised in this period',
        currency,
      ),
      buildKpi(
        'ratio',
        'Chargeback ratio',
        ratio,
        previousRatio,
        'percent',
        false,
        'Disputes as a share of transactions',
      ),
      buildKpi(
        'avoided',
        'Liability avoided',
        avoided,
        previousAvoided,
        'currency',
        true,
        'Chargebacks prevented by resolving alerts in time',
        currency,
      ),
    ];

    /* ---------------- breakdowns ---------------- */

    const reasonBreakdown: ReasonBreakdownItem[] = (
      Object.keys(REASON_CATEGORY_META) as ReasonCategory[]
    )
      .map((category) => {
        const items = inRange.filter((c) => c.reasonCategory === category);
        return {
          category,
          label: REASON_CATEGORY_META[category].label,
          count: items.length,
          amount: {
            amount: items.reduce((sum, c) => sum + c.disputedAmount.amount, 0),
            currency,
          },
          winRate: winRateOf(items),
          share: inRange.length === 0 ? 0 : items.length / inRange.length,
        };
      })
      .sort((a, b) => b.count - a.count);

    const cardBrandBreakdown: CardBrandBreakdownItem[] = (
      Object.keys(CARD_BRAND_META) as CardBrand[]
    )
      .map((brand) => {
        const items = inRange.filter((c) => c.cardBrand === brand);
        const meta = CARD_BRAND_META[brand];
        // Apportion the transaction denominator by each brand's typical share
        // of volume, so a low-volume brand is not judged against the total.
        const brandShare = { visa: 0.52, mastercard: 0.3, amex: 0.11, discover: 0.07 }[brand];
        const brandTransactions = Math.max(1, Math.round(totalTransactions * brandShare));

        return {
          cardBrand: brand,
          label: meta.label,
          count: items.length,
          amount: {
            amount: items.reduce((sum, c) => sum + c.disputedAmount.amount, 0),
            currency,
          },
          winRate: winRateOf(items),
          ratio: items.length / brandTransactions,
          threshold: meta.monitoringThreshold,
          thresholdProgramme: meta.thresholdProgramme,
        };
      })
      .sort((a, b) => b.count - a.count);

    const byCode = new Map<string, DisputeCase[]>();
    for (const item of inRange) {
      const key = `${item.cardBrand}:${item.reasonCode}`;
      const existing = byCode.get(key);
      if (existing) existing.push(item);
      else byCode.set(key, [item]);
    }

    const topReasonCodes: ReasonCodeLeader[] = [...byCode.entries()]
      .map(([key, items]) => {
        const first = items[0]!;
        const meta = REASON_CODES.find(
          (r) => r.code === first.reasonCode && r.network === first.cardBrand,
        );
        return {
          code: first.reasonCode,
          title: meta?.title ?? first.reasonTitle,
          cardBrand: first.cardBrand,
          count: items.length,
          amount: {
            amount: items.reduce((sum, c) => sum + c.disputedAmount.amount, 0),
            currency,
          },
          winRate: winRateOf(items),
          _key: key,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ _key, ...rest }) => rest);

    return {
      range: query.range,
      generatedAt: toIso(now),
      kpis,
      volumeSeries,
      winRateSeries,
      recoverySeries,
      ratioSeries,
      reasonBreakdown,
      cardBrandBreakdown,
      topReasonCodes,
    };
  },

  /* ---------------- saved reports ---------------- */

  async listReports(tenantId: string): Promise<SavedReport[]> {
    return repositories.reports.listByTenant(tenantId);
  },

  async createReport(
    tenantId: string,
    input: SavedReportCreate,
    actor: User,
  ): Promise<SavedReport> {
    return repositories.reports.create({
      ...input,
      id: `rpt_${Date.now().toString(36)}`,
      tenantId,
      lastRunAt: null,
      createdBy: actor.name,
      createdAt: toIso(new Date()),
    });
  },

  async deleteReport(tenantId: string, id: string): Promise<void> {
    await repositories.reports.remove(tenantId, id);
  },

  /**
   * Export.
   *
   * Returns CSV text rather than a file handle so the route can stream it
   * straight to the client with a download header — no temp files, no storage
   * dependency, and identical behaviour in every environment.
   */
  async exportCsv(tenantId: string, dataset: SavedReport['dataset']): Promise<string> {
    const escape = (value: unknown): string => {
      const text = String(value ?? '');
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const toCsv = (headers: string[], rows: unknown[][]): string =>
      [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');

    if (dataset === 'alerts') {
      const alerts = await repositories.alerts.listByTenant(tenantId);
      return toCsv(
        ['Alert Ref', 'Network', 'Type', 'Status', 'Amount', 'Currency', 'Card', 'Order', 'Received', 'Expires', 'Resolved By'],
        alerts.map((a) => [
          a.alertRef, a.network, a.type, a.status,
          (a.amount.amount / 100).toFixed(2), a.amount.currency,
          `${a.cardBrand} ••${a.cardLast4}`, a.orderId,
          a.receivedAt, a.expiresAt, a.resolvedBy ?? '',
        ]),
      );
    }

    const cases = await repositories.cases.listByTenant(tenantId);

    if (dataset === 'ratio') {
      const byMonth = new Map<string, number>();
      for (const item of cases) {
        const key = item.chargebackDate.slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
      }
      return toCsv(
        ['Month', 'Chargebacks', 'Est. Transactions', 'Ratio'],
        [...byMonth.entries()].sort().map(([month, count]) => {
          const transactions = transactionsOnDay(tenantId, new Date(`${month}-15T00:00:00Z`)) * 30;
          return [month, count, transactions, (count / transactions).toFixed(5)];
        }),
      );
    }

    const rows = dataset === 'recovery' ? cases.filter((c) => c.status === 'won') : cases;

    return toCsv(
      ['Case Number', 'Status', 'Stage', 'Card Brand', 'Reason Code', 'Reason', 'Category', 'Disputed', 'Currency', 'Order', 'Customer', 'Chargeback Date', 'Respond By', 'Assigned To'],
      rows.map((c) => [
        c.caseNumber, c.status, c.stage, c.cardBrand, c.reasonCode, c.reasonTitle, c.reasonCategory,
        (c.disputedAmount.amount / 100).toFixed(2), c.disputedAmount.currency,
        c.orderId, c.customer.name, c.chargebackDate, c.respondBy, c.assignedToName ?? '',
      ]),
    );
  },

  async runReport(tenantId: string, id: string): Promise<SavedReport> {
    const report = await repositories.reports.findById(tenantId, id);
    if (!report) throw new NotFoundError('Report');
    await repositories.reports.remove(tenantId, id);
    return repositories.reports.create({ ...report, lastRunAt: toIso(new Date()) });
  },
};
