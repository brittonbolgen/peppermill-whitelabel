import {
  CARD_BRAND_META,
  REASON_CATEGORY_META,
  REASON_CODES,
  ROLES,
  type Alert,
  type AlertStatus,
  type ApiUsage,
  type CardBrand,
  type CaseStage,
  type CaseStatus,
  type Currency,
  type DisputeCase,
  type Evidence,
  type EvidenceType,
  type HelpArticle,
  type Incident,
  type Integration,
  type Notification,
  type NotificationPreferences,
  type ReasonCategory,
  type SavedReport,
  type SupportTicket,
  type SyncJob,
  type Tenant,
  type TimelineEvent,
  type TimeSeriesPoint,
  type User,
  type UserRole,
} from '@peppermill/shared';

import {
  AVATAR_COLORS,
  COUNTRIES,
  DESCRIPTORS,
  EMAIL_DOMAINS,
  EVIDENCE_FILES,
  FIRST_NAMES,
  HELP_ARTICLES,
  LAST_NAMES,
  PRODUCTS,
  STAFF,
} from './catalog.js';
import { createRandom, pad, type Random } from './random.js';
import { TENANTS } from './tenants.js';
import { addDays, addHours, dayKey, toIso } from '../utils/dates.js';

/**
 * Demo data set.
 *
 * Built in memory at boot from a fixed seed, anchored to the current date so
 * the portal always looks live. The generator deliberately produces a skewed,
 * slightly messy distribution — a handful of overdue cases, a couple of failed
 * sync jobs, one open incident — because a data set where everything is green
 * demonstrates nothing.
 */

export interface MonitoringData {
  integrations: Integration[];
  syncJobs: SyncJob[];
  incidents: Incident[];
  apiUsage: ApiUsage;
  uptimeSeries: TimeSeriesPoint[];
}

export interface Dataset {
  tenants: Tenant[];
  users: User[];
  cases: DisputeCase[];
  alerts: Alert[];
  notifications: Notification[];
  tickets: SupportTicket[];
  reports: SavedReport[];
  articles: HelpArticle[];
  notificationPreferences: NotificationPreferences[];
  monitoring: Record<string, MonitoringData>;
}

/** Case volume per tenant — PepperMill is the showcase, so it carries the most. */
const CASE_VOLUME: Record<string, number> = {
  tenant_peppermill: 420,
  tenant_cb911: 260,
  tenant_northwind: 150,
};

const ALERT_VOLUME: Record<string, number> = {
  tenant_peppermill: 180,
  tenant_cb911: 120,
  tenant_northwind: 60,
};

function fullName(rng: Random): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function emailFor(name: string, rng: Random): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
  return `${slug}@${rng.pick(EMAIL_DOMAINS)}`;
}

function staffEmail(name: string, tenant: Tenant): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
  return `${slug}@${tenant.slug}.example`;
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

function buildUsers(tenant: Tenant, rng: Random, now: Date): User[] {
  return STAFF.map((member, index) => {
    const status = index === 6 ? 'invited' : index === 7 ? 'suspended' : 'active';
    return {
      id: `usr_${tenant.slug}_${pad(index + 1, 3)}`,
      tenantId: tenant.id,
      name: member.name,
      email: staffEmail(member.name, tenant),
      role: member.role as UserRole,
      status,
      jobTitle: member.jobTitle,
      department: member.department,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length] as string,
      // Elevated roles are the ones that carry a second factor in the demo.
      mfaEnabled: member.role === 'owner' || member.role === 'admin' || rng.bool(0.4),
      lastActiveAt:
        status === 'invited' ? null : toIso(addHours(now, -rng.int(1, 340))),
      createdAt: toIso(addDays(now, -rng.int(120, 900))),
    } satisfies User;
  });
}

/* ------------------------------------------------------------------ */
/* Cases                                                               */
/* ------------------------------------------------------------------ */

/**
 * Status is derived from age rather than picked at random: a dispute raised
 * two days ago cannot already be won, and one raised nine months ago should
 * not still be sitting in the "needs action" bucket.
 */
function statusForAge(ageDays: number, rng: Random): CaseStatus {
  if (ageDays <= 3) {
    return rng.weighted([
      ['new', 60],
      ['under_review', 25],
      ['evidence_required', 15],
    ] as const);
  }
  if (ageDays <= 12) {
    return rng.weighted([
      ['under_review', 30],
      ['evidence_required', 30],
      ['submitted', 30],
      ['accepted', 10],
    ] as const);
  }
  if (ageDays <= 45) {
    return rng.weighted([
      ['submitted', 35],
      ['won', 28],
      ['lost', 22],
      ['accepted', 10],
      ['expired', 5],
    ] as const);
  }
  return rng.weighted([
    ['won', 46],
    ['lost', 34],
    ['accepted', 14],
    ['expired', 6],
  ] as const);
}

function stageForStatus(status: CaseStatus, rng: Random): CaseStage {
  if (status === 'new') return rng.weighted([['retrieval', 20], ['first_chargeback', 80]] as const);
  if (status === 'won' || status === 'lost') {
    return rng.weighted([
      ['first_chargeback', 72],
      ['pre_arbitration', 20],
      ['arbitration', 8],
    ] as const);
  }
  return rng.weighted([['first_chargeback', 85], ['pre_arbitration', 15]] as const);
}

function buildEvidence(
  count: number,
  category: ReasonCategory,
  rng: Random,
  uploadedBy: string,
  baseDate: Date,
): Evidence[] {
  const preferred: Record<ReasonCategory, EvidenceType[]> = {
    fraud: ['avs_cvv_result', 'device_fingerprint', 'customer_correspondence', 'proof_of_delivery'],
    authorization: ['authorization_log', 'invoice', 'other'],
    processing: ['invoice', 'refund_proof', 'authorization_log'],
    consumer: ['proof_of_delivery', 'terms_accepted', 'customer_correspondence', 'invoice'],
  };

  const types = rng.sample(preferred[category], count);

  return types.map((type, index) => {
    const file = rng.pick(EVIDENCE_FILES[type] ?? EVIDENCE_FILES.other!);
    return {
      id: `ev_${rng.int(100000, 999999)}_${index}`,
      type,
      fileName: file.fileName,
      fileSize: rng.int(48_000, 4_200_000),
      mimeType: file.mimeType,
      uploadedAt: toIso(addHours(baseDate, rng.int(2, 90))),
      uploadedBy,
      note: '',
    } satisfies Evidence;
  });
}

function buildTimeline(
  status: CaseStatus,
  chargebackDate: Date,
  assignee: string | null,
  evidenceCount: number,
  rng: Random,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  let cursor = chargebackDate;
  let seq = 0;

  const push = (
    type: TimelineEvent['type'],
    message: string,
    actor: string,
    actorType: TimelineEvent['actorType'],
    hoursLater: number,
  ) => {
    cursor = addHours(cursor, hoursLater);
    seq += 1;
    events.push({
      id: `tl_${rng.int(100000, 999999)}_${seq}`,
      type,
      message,
      actor,
      actorType,
      createdAt: toIso(cursor),
    });
  };

  push('case_opened', 'Chargeback received from the acquirer and opened for review.', 'Acquirer feed', 'network', 0);

  if (assignee) {
    push('assigned', `Case assigned to ${assignee}.`, 'Amelia Cross', 'user', rng.int(1, 8));
  }

  if (status !== 'new') {
    push('status_changed', 'Status moved to Under Review.', 'Amelia Cross', 'user', rng.int(2, 20));
  }

  for (let i = 0; i < evidenceCount; i += 1) {
    push('evidence_added', 'Supporting document attached to the case file.', assignee ?? 'Sian Whitlock', 'user', rng.int(1, 14));
  }

  if (status === 'submitted' || status === 'won' || status === 'lost') {
    push('representment_submitted', 'Representment packet submitted to the issuing bank.', assignee ?? 'Sian Whitlock', 'user', rng.int(4, 40));
  }

  if (status === 'won') {
    push('network_response', 'Issuer ruled in the merchant’s favour. Funds returned.', 'Card network', 'network', rng.int(120, 600));
  }
  if (status === 'lost') {
    push('network_response', 'Issuer upheld the cardholder’s claim. Liability stands.', 'Card network', 'network', rng.int(120, 600));
  }
  if (status === 'accepted') {
    push('status_changed', 'Merchant accepted liability without representment.', 'Amelia Cross', 'user', rng.int(6, 60));
  }
  if (status === 'expired') {
    push('deadline_reminder', 'Response window closed before a packet was submitted.', 'System', 'system', rng.int(200, 700));
  }
  if (status === 'evidence_required') {
    push('deadline_reminder', 'Additional evidence required before this case can be submitted.', 'System', 'system', rng.int(6, 30));
  }

  return events;
}

function buildCases(tenant: Tenant, users: User[], rng: Random, now: Date): DisputeCase[] {
  const count = CASE_VOLUME[tenant.id] ?? 200;
  const currency = tenant.defaultCurrency as Currency;
  const agents = users.filter((u) => u.status === 'active' && u.role !== 'viewer');
  const cases: DisputeCase[] = [];

  for (let i = 0; i < count; i += 1) {
    // Squaring the roll biases the set towards recent activity, so the last
    // 30 days are dense enough for the dashboard to look busy.
    const ageDays = Math.floor(Math.pow(rng.next(), 2) * 365);
    const chargebackDate = addDays(now, -ageDays);
    const transactionDate = addDays(chargebackDate, -rng.int(4, 70));

    const cardBrand = rng.weighted([
      ['visa', 52],
      ['mastercard', 30],
      ['amex', 11],
      ['discover', 7],
    ] as const) as CardBrand;

    const brandCodes = REASON_CODES.filter((r) => r.network === cardBrand);
    const reason = rng.pick(brandCodes);

    const status = statusForAge(ageDays, rng);
    const stage = stageForStatus(status, rng);

    const transactionMinor = rng.int(8_500, 289_500);
    // Partial disputes are common on multi-item furniture orders.
    const disputedMinor = rng.bool(0.24)
      ? Math.round(transactionMinor * rng.float(0.3, 0.85))
      : transactionMinor;

    const customerName = fullName(rng);
    const assignee = status === 'new' && rng.bool(0.5) ? null : rng.pick(agents);

    const respondBy = addDays(chargebackDate, reason.responseWindowDays);

    const evidenceCount =
      status === 'new' ? rng.int(0, 1) : status === 'evidence_required' ? rng.int(0, 2) : rng.int(2, 5);

    const evidence = buildEvidence(
      evidenceCount,
      reason.category,
      rng,
      assignee?.name ?? 'Sian Whitlock',
      chargebackDate,
    );

    /**
     * Likelihood leans on the two factors that actually move win rates:
     * how strong the evidence packet is, and whether the reason code is
     * one that documentary proof can answer.
     */
    const categoryBase: Record<ReasonCategory, number> = {
      fraud: 34,
      authorization: 62,
      processing: 71,
      consumer: 48,
    };
    const likelihood = Math.max(
      4,
      Math.min(96, categoryBase[reason.category] + evidence.length * 6 + rng.int(-14, 14)),
    );

    const priority =
      disputedMinor > 180_000 || likelihood > 75
        ? rng.weighted([['critical', 25], ['high', 45], ['medium', 30]] as const)
        : rng.weighted([['high', 20], ['medium', 50], ['low', 30]] as const);

    const createdAt = toIso(chargebackDate);
    const timeline = buildTimeline(status, chargebackDate, assignee?.name ?? null, evidence.length, rng);
    const lastEvent = timeline[timeline.length - 1];

    cases.push({
      id: `case_${tenant.slug}_${pad(i + 1, 5)}`,
      tenantId: tenant.id,
      caseNumber: `PM-${chargebackDate.getUTCFullYear()}-${pad(10_000 + i, 5)}`,
      status,
      stage,
      priority,
      disputedAmount: { amount: disputedMinor, currency },
      transactionAmount: { amount: transactionMinor, currency },
      cardBrand,
      reasonCode: reason.code,
      reasonTitle: reason.title,
      reasonCategory: reason.category,
      orderId: `PM${pad(rng.int(100000, 999999), 6)}`,
      descriptor: rng.pick(DESCRIPTORS),
      productName: rng.pick(PRODUCTS),
      customer: {
        name: customerName,
        email: emailFor(customerName, rng),
        cardLast4: pad(rng.int(0, 9999), 4),
        country: rng.pick(COUNTRIES),
      },
      transactionDate: toIso(transactionDate),
      chargebackDate: createdAt,
      respondBy: toIso(respondBy),
      assignedToId: assignee?.id ?? null,
      assignedToName: assignee?.name ?? null,
      recoveryLikelihood: likelihood,
      evidence,
      timeline,
      notes: '',
      createdAt,
      updatedAt: lastEvent?.createdAt ?? createdAt,
    });
  }

  return cases.sort(
    (a, b) => new Date(b.chargebackDate).getTime() - new Date(a.chargebackDate).getTime(),
  );
}

/* ------------------------------------------------------------------ */
/* Prevention alerts                                                   */
/* ------------------------------------------------------------------ */

function buildAlerts(tenant: Tenant, users: User[], rng: Random, now: Date): Alert[] {
  const count = ALERT_VOLUME[tenant.id] ?? 100;
  const currency = tenant.defaultCurrency as Currency;
  const agents = users.filter((u) => u.status === 'active');
  const alerts: Alert[] = [];

  for (let i = 0; i < count; i += 1) {
    const ageHours = Math.floor(Math.pow(rng.next(), 2) * 24 * 120);
    const receivedAt = addHours(now, -ageHours);
    // Deflection networks give a 24–72 hour window to act.
    const windowHours = rng.pick([24, 48, 72]);
    const expiresAt = addHours(receivedAt, windowHours);
    const hasExpired = expiresAt.getTime() < now.getTime();

    const status: AlertStatus = hasExpired
      ? rng.weighted([
          ['refunded', 52],
          ['accepted', 22],
          ['declined', 8],
          ['expired', 18],
        ] as const)
      : 'pending';

    const amountMinor = rng.int(6_500, 240_000);
    const resolver = status === 'pending' || status === 'expired' ? null : rng.pick(agents);
    const resolvedAt =
      resolver && status !== 'expired'
        ? toIso(addHours(receivedAt, rng.int(1, Math.max(2, windowHours - 2))))
        : null;

    const outcomeText: Record<AlertStatus, string | null> = {
      pending: null,
      refunded: 'Refunded in full before the dispute was raised.',
      accepted: 'Liability accepted; chargeback expected and will be fought.',
      declined: 'Alert declined — order verified as legitimate.',
      expired: 'Window lapsed with no action; chargeback anticipated.',
    };

    alerts.push({
      id: `alrt_${tenant.slug}_${pad(i + 1, 5)}`,
      tenantId: tenant.id,
      alertRef: `${rng.pick(['ETH', 'RDR', 'CDR'])}-${pad(rng.int(1, 999999), 6)}`,
      network: rng.weighted([
        ['ethoca', 48],
        ['rdr', 34],
        ['cdrn', 18],
      ] as const),
      type: rng.weighted([
        ['fraud', 55],
        ['customer_dispute', 33],
        ['inquiry', 12],
      ] as const),
      status,
      amount: { amount: amountMinor, currency },
      cardBrand: rng.weighted([
        ['visa', 50],
        ['mastercard', 32],
        ['amex', 11],
        ['discover', 7],
      ] as const) as CardBrand,
      cardLast4: pad(rng.int(0, 9999), 4),
      descriptor: rng.pick(DESCRIPTORS),
      orderId: `PM${pad(rng.int(100000, 999999), 6)}`,
      customerName: fullName(rng),
      customerEmail: emailFor(fullName(rng), rng),
      transactionDate: toIso(addDays(receivedAt, -rng.int(1, 21))),
      receivedAt: toIso(receivedAt),
      expiresAt: toIso(expiresAt),
      resolvedAt,
      resolvedBy: resolver?.name ?? null,
      outcome: outcomeText[status],
      // Only a genuine deflection avoids the chargeback and its fee.
      avoidedAmount:
        status === 'refunded' || status === 'declined'
          ? { amount: amountMinor + 2_500, currency }
          : null,
      createdAt: toIso(receivedAt),
    });
  }

  return alerts.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

function buildNotifications(
  tenant: Tenant,
  cases: DisputeCase[],
  rng: Random,
  now: Date,
): Notification[] {
  const items: Notification[] = [];
  const recent = cases.slice(0, 40);
  let seq = 0;

  const add = (
    category: Notification['category'],
    severity: Notification['severity'],
    title: string,
    body: string,
    link: string | null,
    hoursAgo: number,
  ) => {
    seq += 1;
    items.push({
      id: `ntf_${tenant.slug}_${pad(seq, 4)}`,
      tenantId: tenant.id,
      category,
      severity,
      title,
      body,
      link,
      // Older items are progressively more likely to have been read.
      read: hoursAgo > 72 ? rng.bool(0.9) : rng.bool(0.35),
      createdAt: toIso(addHours(now, -hoursAgo)),
    });
  };

  for (const item of recent.slice(0, 12)) {
    const hoursLeft = (new Date(item.respondBy).getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft > 0 && hoursLeft < 72 && item.status !== 'submitted') {
      add(
        'deadline',
        hoursLeft < 24 ? 'critical' : 'warning',
        `Case ${item.caseNumber} is due in ${Math.max(1, Math.round(hoursLeft))} hours`,
        `${item.reasonCode} — ${item.reasonTitle}. Submit the representment before the network window closes.`,
        `/cases/${item.id}`,
        rng.int(1, 40),
      );
    }
  }

  for (const item of rng.sample(recent, 8)) {
    add(
      'case',
      'info',
      `New chargeback received — ${item.caseNumber}`,
      `${item.cardBrand.toUpperCase()} ${item.reasonCode} on order ${item.orderId}.`,
      `/cases/${item.id}`,
      rng.int(2, 120),
    );
  }

  const won = cases.filter((c) => c.status === 'won').slice(0, 6);
  for (const item of won) {
    add(
      'case',
      'success',
      `Representment won — ${item.caseNumber}`,
      'The issuer ruled in your favour and the disputed funds have been returned.',
      `/cases/${item.id}`,
      rng.int(12, 300),
    );
  }

  add('alert', 'warning', 'Prevention alerts expiring soon', 'Several alerts lapse within 24 hours. Resolve them to avoid new chargebacks.', '/alerts', 6);
  add('alert', 'info', 'Ethoca feed delivered 34 new alerts', 'The overnight batch has been ingested and is ready for review.', '/alerts', 14);
  add('report', 'info', 'Monthly dispute summary is ready', 'Your scheduled report for last month has been generated.', '/analytics', 30);
  add('report', 'success', 'Recovery report exported', 'The CSV export you requested has finished processing.', '/analytics', 52);
  add('system', 'warning', 'Gateway sync ran behind schedule', 'The 04:00 transaction sync completed 42 minutes late. No records were lost.', '/monitoring', 20);
  add('system', 'info', 'Scheduled maintenance this weekend', 'The reporting warehouse will be briefly unavailable on Sunday 02:00–04:00 UTC.', '/monitoring', 70);
  add('security', 'critical', 'Sign-in from an unrecognised device', 'A session was started from a new device in Manchester, GB. Review if this was not you.', '/settings/security', 9);
  add('security', 'info', 'Two-factor authentication enabled', 'MFA was switched on for a member of your team.', '/users', 96);

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/* ------------------------------------------------------------------ */
/* Monitoring                                                          */
/* ------------------------------------------------------------------ */

function buildMonitoring(tenant: Tenant, rng: Random, now: Date): MonitoringData {
  const integrations: Integration[] = [
    {
      id: 'int_acquirer',
      name: 'Barclaycard Acquiring',
      category: 'acquirer',
      status: 'operational',
      latencyMs: rng.int(120, 320),
      uptime30d: rng.float(0.9985, 0.9999, 4),
      lastSyncedAt: toIso(addHours(now, -1)),
      lastSyncRecords: rng.int(1200, 4800),
      message: 'Chargeback and retrieval feed healthy.',
    },
    {
      id: 'int_gateway',
      name: 'Stripe Gateway',
      category: 'gateway',
      status: 'operational',
      latencyMs: rng.int(60, 180),
      uptime30d: rng.float(0.999, 1, 4),
      lastSyncedAt: toIso(addHours(now, -0.4)),
      lastSyncRecords: rng.int(8000, 22000),
      message: 'Transaction and settlement sync healthy.',
    },
    {
      id: 'int_ethoca',
      name: 'Ethoca Alerts',
      category: 'deflection',
      // One degraded integration keeps the monitoring screen honest.
      status: 'degraded',
      latencyMs: rng.int(900, 1800),
      uptime30d: rng.float(0.972, 0.988, 4),
      lastSyncedAt: toIso(addHours(now, -3.2)),
      lastSyncRecords: rng.int(20, 90),
      message: 'Elevated latency on the alert feed. Delivery is delayed by up to 20 minutes.',
    },
    {
      id: 'int_rdr',
      name: 'Visa RDR',
      category: 'deflection',
      status: 'operational',
      latencyMs: rng.int(180, 420),
      uptime30d: rng.float(0.996, 0.9999, 4),
      lastSyncedAt: toIso(addHours(now, -0.9)),
      lastSyncRecords: rng.int(10, 60),
      message: 'Rapid Dispute Resolution rules applying normally.',
    },
    {
      id: 'int_crm',
      name: 'Zendesk CRM',
      category: 'crm',
      status: 'operational',
      latencyMs: rng.int(200, 500),
      uptime30d: rng.float(0.994, 0.999, 4),
      lastSyncedAt: toIso(addHours(now, -2)),
      lastSyncRecords: rng.int(80, 400),
      message: 'Customer correspondence sync healthy.',
    },
    {
      id: 'int_storage',
      name: 'Evidence Vault',
      category: 'storage',
      status: 'operational',
      latencyMs: rng.int(40, 120),
      uptime30d: 1,
      lastSyncedAt: toIso(addHours(now, -0.2)),
      lastSyncRecords: rng.int(30, 200),
      message: 'Document storage and retrieval healthy.',
    },
  ];

  const syncJobs: SyncJob[] = [
    {
      id: 'job_cb_ingest',
      name: 'Chargeback ingestion',
      integrationId: 'int_acquirer',
      status: 'success',
      startedAt: toIso(addHours(now, -1.1)),
      finishedAt: toIso(addHours(now, -1)),
      durationMs: rng.int(38_000, 96_000),
      recordsProcessed: rng.int(120, 480),
      recordsFailed: 0,
      schedule: '0 */2 * * *',
      nextRunAt: toIso(addHours(now, 0.9)),
      error: null,
    },
    {
      id: 'job_txn_sync',
      name: 'Transaction settlement sync',
      integrationId: 'int_gateway',
      status: 'running',
      startedAt: toIso(addHours(now, -0.1)),
      finishedAt: null,
      durationMs: null,
      recordsProcessed: rng.int(2000, 9000),
      recordsFailed: 0,
      schedule: '*/30 * * * *',
      nextRunAt: toIso(addHours(now, 0.5)),
      error: null,
    },
    {
      id: 'job_alert_poll',
      name: 'Prevention alert poll',
      integrationId: 'int_ethoca',
      status: 'failed',
      startedAt: toIso(addHours(now, -3.4)),
      finishedAt: toIso(addHours(now, -3.2)),
      durationMs: rng.int(110_000, 240_000),
      recordsProcessed: rng.int(10, 40),
      recordsFailed: rng.int(3, 14),
      schedule: '*/15 * * * *',
      nextRunAt: toIso(addHours(now, 0.2)),
      error: 'Upstream returned 504 Gateway Timeout on page 3 of 5. Partial batch retained; retry scheduled.',
    },
    {
      id: 'job_report_build',
      name: 'Nightly report build',
      integrationId: 'int_storage',
      status: 'success',
      startedAt: toIso(addHours(now, -9)),
      finishedAt: toIso(addHours(now, -8.7)),
      durationMs: rng.int(600_000, 1_200_000),
      recordsProcessed: rng.int(4000, 12000),
      recordsFailed: 0,
      schedule: '0 3 * * *',
      nextRunAt: toIso(addHours(now, 15)),
      error: null,
    },
    {
      id: 'job_crm_link',
      name: 'CRM correspondence link',
      integrationId: 'int_crm',
      status: 'queued',
      startedAt: toIso(addHours(now, -0.05)),
      finishedAt: null,
      durationMs: null,
      recordsProcessed: 0,
      recordsFailed: 0,
      schedule: '0 */6 * * *',
      nextRunAt: toIso(addHours(now, 2.4)),
      error: null,
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'inc_001',
      title: 'Elevated latency on the Ethoca alert feed',
      status: 'monitoring',
      severity: 'minor',
      affectedServices: ['Ethoca Alerts'],
      startedAt: toIso(addHours(now, -5)),
      resolvedAt: null,
      updates: [
        {
          id: 'iu_003',
          message: 'A fix has been applied upstream and latency is recovering. We are monitoring the feed.',
          createdAt: toIso(addHours(now, -1.2)),
        },
        {
          id: 'iu_002',
          message: 'Root cause identified as a rate limit on the provider side. Backoff has been adjusted.',
          createdAt: toIso(addHours(now, -3)),
        },
        {
          id: 'iu_001',
          message: 'We are investigating delayed delivery of prevention alerts.',
          createdAt: toIso(addHours(now, -5)),
        },
      ],
    },
    {
      id: 'inc_000',
      title: 'Scheduled warehouse maintenance',
      status: 'resolved',
      severity: 'minor',
      affectedServices: ['Reporting'],
      startedAt: toIso(addDays(now, -9)),
      resolvedAt: toIso(addDays(now, -9)),
      updates: [
        {
          id: 'iu_100',
          message: 'Maintenance completed. Reporting is fully available.',
          createdAt: toIso(addDays(now, -9)),
        },
      ],
    },
  ];

  const usageSeries: TimeSeriesPoint[] = [];
  const uptimeSeries: TimeSeriesPoint[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = addDays(now, -i);
    usageSeries.push({ date: dayKey(day), value: rng.int(18_000, 46_000) });
    uptimeSeries.push({
      date: dayKey(day),
      // A single dip gives the uptime chart something to say.
      value: i === 12 ? rng.float(0.981, 0.991, 4) : rng.float(0.998, 1, 4),
    });
  }

  const apiUsage: ApiUsage = {
    callsThisPeriod: usageSeries.reduce((sum, p) => sum + p.value, 0),
    quota: 1_500_000,
    errorRate: rng.float(0.002, 0.011, 4),
    p95LatencyMs: rng.int(180, 420),
    series: usageSeries,
  };

  return { integrations, syncJobs, incidents, apiUsage, uptimeSeries };
}

/* ------------------------------------------------------------------ */
/* Support                                                             */
/* ------------------------------------------------------------------ */

function buildTickets(
  tenant: Tenant,
  users: User[],
  cases: DisputeCase[],
  rng: Random,
  now: Date,
): SupportTicket[] {
  const seeds: {
    subject: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    status: SupportTicket['status'];
    body: string;
    reply: string | null;
  }[] = [
    {
      subject: 'Representment rejected as incomplete — what was missing?',
      category: 'dispute_help',
      priority: 'high',
      status: 'open',
      body: 'We submitted a full packet on a Visa 13.1 with signed delivery proof and the issuer still returned it as incomplete. Can you review what we sent and tell us what the reviewer expected?',
      reply: null,
    },
    {
      subject: 'Ethoca alerts arriving several hours late',
      category: 'integration',
      priority: 'urgent',
      status: 'pending',
      body: 'Alerts that used to land within minutes are now showing up three or four hours after the transaction. Two lapsed overnight before anyone could action them.',
      reply: 'Thanks for flagging this. It matches the open incident on our Ethoca feed — the provider applied a new rate limit. We have adjusted our backoff and latency is recovering. I will keep this ticket open until it is fully clear.',
    },
    {
      subject: 'Add VAT breakdown to the monthly recovery export',
      category: 'reporting',
      priority: 'normal',
      status: 'pending',
      body: 'Our finance team needs the recovery CSV split by net and VAT so it can be reconciled against the ledger without manual work.',
      reply: 'That is a reasonable ask and it is now with our reporting team. I will confirm a target release once it has been scoped.',
    },
    {
      subject: 'Please remove a former team member',
      category: 'account',
      priority: 'normal',
      status: 'resolved',
      body: 'One of our agents has left the business and should no longer have portal access.',
      reply: 'Done — the account has been suspended and all active sessions were revoked. You can also do this yourself from User Management at any time.',
    },
    {
      subject: 'Invoice query for last quarter',
      category: 'billing',
      priority: 'low',
      status: 'closed',
      body: 'The alert volume on our Q1 invoice looks higher than what the portal reported. Could you reconcile the two?',
      reply: 'The invoice includes alerts that expired before resolution, which the portal excludes from its deflection count. I have attached a line-by-line breakdown. Both figures are correct — they measure different things.',
    },
    {
      subject: 'How should we handle partial refunds on split orders?',
      category: 'dispute_help',
      priority: 'normal',
      status: 'resolved',
      body: 'When a customer disputes only part of a multi-item order, should we refund the disputed line or wait for the representment outcome?',
      reply: 'Refund the disputed line if the claim is likely valid — a partial refund logged before the response deadline is accepted as compelling evidence on a 13.6. If you intend to fight it, hold the refund and attach the itemised invoice instead.',
    },
  ];

  return seeds.map((seed, index) => {
    const requester = users[index % users.length]!;
    const createdAt = addDays(now, -rng.int(1, 40));
    const responded = seed.reply !== null;
    const firstRespondedAt = responded ? addHours(createdAt, rng.int(1, 9)) : null;

    const messages: SupportTicket['messages'] = [
      {
        id: `msg_${index}_1`,
        author: requester.name,
        authorType: 'merchant',
        body: seed.body,
        createdAt: toIso(createdAt),
      },
    ];

    if (seed.reply && firstRespondedAt) {
      messages.push({
        id: `msg_${index}_2`,
        author: 'Chargebacks911 Support',
        authorType: 'support',
        body: seed.reply,
        createdAt: toIso(firstRespondedAt),
      });
    }

    const lastMessage = messages[messages.length - 1]!;

    return {
      id: `tkt_${tenant.slug}_${pad(index + 1, 4)}`,
      tenantId: tenant.id,
      ticketNumber: `SUP-${pad(4200 + index, 5)}`,
      subject: seed.subject,
      status: seed.status,
      priority: seed.priority,
      category: seed.category,
      relatedCaseId: seed.category === 'dispute_help' ? (cases[index]?.id ?? null) : null,
      requesterName: requester.name,
      requesterEmail: requester.email,
      assigneeName: responded ? 'Chargebacks911 Support' : null,
      messages,
      slaResponseHours: seed.priority === 'urgent' ? 2 : seed.priority === 'high' ? 4 : 12,
      firstRespondedAt: firstRespondedAt ? toIso(firstRespondedAt) : null,
      createdAt: toIso(createdAt),
      updatedAt: lastMessage.createdAt,
    } satisfies SupportTicket;
  });
}

/* ------------------------------------------------------------------ */
/* Saved reports and preferences                                       */
/* ------------------------------------------------------------------ */

function buildReports(tenant: Tenant, users: User[], rng: Random, now: Date): SavedReport[] {
  const owner = users[0]!;
  const seeds: Omit<SavedReport, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'lastRunAt'>[] = [
    {
      name: 'Monthly dispute summary',
      description: 'Case volume, win rate and recovered value for the finance pack.',
      dataset: 'cases',
      range: '30d',
      format: 'pdf',
      schedule: 'monthly',
      recipients: [owner.email, users[1]!.email],
    },
    {
      name: 'Weekly deflection performance',
      description: 'Prevention alert throughput and avoided liability by network.',
      dataset: 'alerts',
      range: '7d',
      format: 'csv',
      schedule: 'weekly',
      recipients: [users[1]!.email],
    },
    {
      name: 'Recovery by reason code',
      description: 'Which reason codes we win, and what they are worth.',
      dataset: 'recovery',
      range: '90d',
      format: 'xlsx',
      schedule: 'none',
      recipients: [],
    },
    {
      name: 'Ratio vs network thresholds',
      description: 'Rolling chargeback ratio against VAMP and ECP ceilings.',
      dataset: 'ratio',
      range: '12m',
      format: 'pdf',
      schedule: 'monthly',
      recipients: [owner.email],
    },
  ];

  return seeds.map((seed, index) => ({
    ...seed,
    id: `rpt_${tenant.slug}_${pad(index + 1, 3)}`,
    tenantId: tenant.id,
    createdBy: owner.name,
    createdAt: toIso(addDays(now, -rng.int(30, 240))),
    lastRunAt: seed.schedule === 'none' ? null : toIso(addDays(now, -rng.int(1, 14))),
  }));
}

function buildNotificationPreferences(tenant: Tenant, users: User[]): NotificationPreferences[] {
  const definitions: {
    category: NotificationPreferences['preferences'][number]['category'];
    label: string;
    description: string;
    email: boolean;
    sms: boolean;
    webhook: boolean;
  }[] = [
    { category: 'deadline', label: 'Response deadlines', description: 'Warnings as a case approaches its network response window.', email: true, sms: true, webhook: true },
    { category: 'case', label: 'Case activity', description: 'New chargebacks, status changes and network rulings.', email: true, sms: false, webhook: true },
    { category: 'alert', label: 'Prevention alerts', description: 'Incoming deflection alerts and expiry warnings.', email: true, sms: false, webhook: true },
    { category: 'report', label: 'Reports and exports', description: 'Scheduled reports and completed exports.', email: true, sms: false, webhook: false },
    { category: 'system', label: 'Platform status', description: 'Integration health, sync failures and maintenance windows.', email: false, sms: false, webhook: true },
    { category: 'security', label: 'Security', description: 'Sign-ins from new devices and changes to access.', email: true, sms: true, webhook: false },
  ];

  return users
    .filter((u) => u.status === 'active')
    .map((user) => ({
      tenantId: tenant.id,
      userId: user.id,
      preferences: definitions.map((d) => ({
        category: d.category,
        label: d.label,
        description: d.description,
        inApp: true,
        email: d.email,
        sms: d.sms,
        webhook: d.webhook,
      })),
      quietHoursEnabled: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '07:00',
      digestFrequency: 'daily' as const,
      webhookUrl: `https://hooks.${tenant.slug}.example/chargebacks911`,
    }));
}

function buildArticles(now: Date): HelpArticle[] {
  return HELP_ARTICLES.map((article, index) => ({
    id: `art_${pad(index + 1, 3)}`,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    category: article.category,
    readMinutes: article.readMinutes,
    body: article.body,
    updatedAt: toIso(addDays(now, -(index + 1) * 11)),
  }));
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export function buildDataset(now = new Date()): Dataset {
  const dataset: Dataset = {
    tenants: TENANTS,
    users: [],
    cases: [],
    alerts: [],
    notifications: [],
    tickets: [],
    reports: [],
    articles: buildArticles(now),
    notificationPreferences: [],
    monitoring: {},
  };

  TENANTS.forEach((tenant, tenantIndex) => {
    // A per-tenant seed keeps each brand's numbers distinct but reproducible.
    const rng = createRandom(0x9e3779b9 + tenantIndex * 7919);

    const users = buildUsers(tenant, rng, now);
    const cases = buildCases(tenant, users, rng, now);
    const alerts = buildAlerts(tenant, users, rng, now);

    dataset.users.push(...users);
    dataset.cases.push(...cases);
    dataset.alerts.push(...alerts);
    dataset.notifications.push(...buildNotifications(tenant, cases, rng, now));
    dataset.tickets.push(...buildTickets(tenant, users, cases, rng, now));
    dataset.reports.push(...buildReports(tenant, users, rng, now));
    dataset.notificationPreferences.push(...buildNotificationPreferences(tenant, users));
    dataset.monitoring[tenant.id] = buildMonitoring(tenant, rng, now);
  });

  return dataset;
}

/** Exposed for the login screen's demo-credentials hint. */
export const DEMO_PASSWORD = 'demo1234';

export { ROLES, REASON_CATEGORY_META, CARD_BRAND_META };
