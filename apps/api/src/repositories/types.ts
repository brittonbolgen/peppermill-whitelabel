import type {
  Alert,
  DisputeCase,
  HelpArticle,
  Notification,
  NotificationPreferences,
  SavedReport,
  SupportTicket,
  Tenant,
} from '@peppermill/shared';
import type { MonitoringData } from '../data/seed.js';

/**
 * Repository contracts.
 *
 * Services depend only on these interfaces, never on a concrete store. The
 * shipped implementation keeps everything in memory from the generated seed;
 * swapping in Postgres, DynamoDB or a REST upstream means writing new classes
 * that satisfy these signatures and registering them in `index.ts`. No service,
 * route or component changes.
 *
 * Every method is async even though the JSON implementation is synchronous,
 * so that a genuinely asynchronous backing store is a drop-in replacement.
 */

export interface TenantRepository {
  list(): Promise<Tenant[]>;
  findById(id: string): Promise<Tenant | undefined>;
  findBySlug(slug: string): Promise<Tenant | undefined>;
  update(id: string, patch: Partial<Tenant>): Promise<Tenant>;
}

export interface UserRepository {
  listByTenant(tenantId: string): Promise<import('@peppermill/shared').User[]>;
  findById(id: string): Promise<import('@peppermill/shared').User | undefined>;
  findByEmail(tenantId: string, email: string): Promise<import('@peppermill/shared').User | undefined>;
  create(user: import('@peppermill/shared').User): Promise<import('@peppermill/shared').User>;
  update(
    id: string,
    patch: Partial<import('@peppermill/shared').User>,
  ): Promise<import('@peppermill/shared').User>;
  remove(id: string): Promise<void>;
}

export interface CaseRepository {
  listByTenant(tenantId: string): Promise<DisputeCase[]>;
  findById(tenantId: string, id: string): Promise<DisputeCase | undefined>;
  update(tenantId: string, id: string, patch: Partial<DisputeCase>): Promise<DisputeCase>;
}

export interface AlertRepository {
  listByTenant(tenantId: string): Promise<Alert[]>;
  findById(tenantId: string, id: string): Promise<Alert | undefined>;
  update(tenantId: string, id: string, patch: Partial<Alert>): Promise<Alert>;
}

export interface NotificationRepository {
  listByTenant(tenantId: string): Promise<Notification[]>;
  findById(tenantId: string, id: string): Promise<Notification | undefined>;
  update(tenantId: string, id: string, patch: Partial<Notification>): Promise<Notification>;
  markAllRead(tenantId: string): Promise<number>;
  getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences | undefined>;
  savePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences>;
}

export interface ReportRepository {
  listByTenant(tenantId: string): Promise<SavedReport[]>;
  findById(tenantId: string, id: string): Promise<SavedReport | undefined>;
  create(report: SavedReport): Promise<SavedReport>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface SupportRepository {
  listByTenant(tenantId: string): Promise<SupportTicket[]>;
  findById(tenantId: string, id: string): Promise<SupportTicket | undefined>;
  create(ticket: SupportTicket): Promise<SupportTicket>;
  update(tenantId: string, id: string, patch: Partial<SupportTicket>): Promise<SupportTicket>;
  listArticles(): Promise<HelpArticle[]>;
  findArticle(slug: string): Promise<HelpArticle | undefined>;
}

export interface MonitoringRepository {
  getByTenant(tenantId: string): Promise<MonitoringData | undefined>;
}

/** The full set of repositories handed to the service layer. */
export interface RepositoryBundle {
  tenants: TenantRepository;
  users: UserRepository;
  cases: CaseRepository;
  alerts: AlertRepository;
  notifications: NotificationRepository;
  reports: ReportRepository;
  support: SupportRepository;
  monitoring: MonitoringRepository;
}
