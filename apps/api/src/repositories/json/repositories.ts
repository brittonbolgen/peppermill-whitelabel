import type {
  Alert,
  DisputeCase,
  HelpArticle,
  Notification,
  NotificationPreferences,
  SavedReport,
  SupportTicket,
  Tenant,
  User,
} from '@peppermill/shared';

import { NotFoundError } from '../../utils/errors.js';
import type { MonitoringData } from '../../data/seed.js';
import { getDataset } from './store.js';
import type {
  AlertRepository,
  CaseRepository,
  MonitoringRepository,
  NotificationRepository,
  ReportRepository,
  RepositoryBundle,
  SupportRepository,
  TenantRepository,
  UserRepository,
} from '../types.js';

/**
 * JSON-backed repositories.
 *
 * These operate on the in-memory dataset. Each mutation replaces the record in
 * its array rather than mutating the object in place, which keeps every read
 * that already holds a reference from observing a half-applied change.
 */

function replaceIn<T extends { id: string }>(collection: T[], id: string, patch: Partial<T>, label: string): T {
  const index = collection.findIndex((item) => item.id === id);
  if (index === -1) throw new NotFoundError(label);
  const updated = { ...collection[index]!, ...patch } as T;
  collection[index] = updated;
  return updated;
}

class JsonTenantRepository implements TenantRepository {
  async list(): Promise<Tenant[]> {
    return getDataset().tenants;
  }

  async findById(id: string): Promise<Tenant | undefined> {
    return getDataset().tenants.find((t) => t.id === id);
  }

  async findBySlug(slug: string): Promise<Tenant | undefined> {
    return getDataset().tenants.find((t) => t.slug === slug);
  }

  async update(id: string, patch: Partial<Tenant>): Promise<Tenant> {
    return replaceIn(getDataset().tenants, id, patch, 'Tenant');
  }
}

class JsonUserRepository implements UserRepository {
  async listByTenant(tenantId: string): Promise<User[]> {
    return getDataset().users.filter((u) => u.tenantId === tenantId);
  }

  async findById(id: string): Promise<User | undefined> {
    return getDataset().users.find((u) => u.id === id);
  }

  async findByEmail(tenantId: string, email: string): Promise<User | undefined> {
    const needle = email.trim().toLowerCase();
    return getDataset().users.find(
      (u) => u.tenantId === tenantId && u.email.toLowerCase() === needle,
    );
  }

  async create(user: User): Promise<User> {
    getDataset().users.push(user);
    return user;
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    return replaceIn(getDataset().users, id, patch, 'User');
  }

  async remove(id: string): Promise<void> {
    const users = getDataset().users;
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new NotFoundError('User');
    users.splice(index, 1);
  }
}

class JsonCaseRepository implements CaseRepository {
  async listByTenant(tenantId: string): Promise<DisputeCase[]> {
    return getDataset().cases.filter((c) => c.tenantId === tenantId);
  }

  async findById(tenantId: string, id: string): Promise<DisputeCase | undefined> {
    // Scoping the lookup by tenant is what stops one brand reading another's
    // data through a guessed identifier.
    return getDataset().cases.find((c) => c.id === id && c.tenantId === tenantId);
  }

  async update(tenantId: string, id: string, patch: Partial<DisputeCase>): Promise<DisputeCase> {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundError('Case');
    return replaceIn(getDataset().cases, id, patch, 'Case');
  }
}

class JsonAlertRepository implements AlertRepository {
  async listByTenant(tenantId: string): Promise<Alert[]> {
    return getDataset().alerts.filter((a) => a.tenantId === tenantId);
  }

  async findById(tenantId: string, id: string): Promise<Alert | undefined> {
    return getDataset().alerts.find((a) => a.id === id && a.tenantId === tenantId);
  }

  async update(tenantId: string, id: string, patch: Partial<Alert>): Promise<Alert> {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundError('Alert');
    return replaceIn(getDataset().alerts, id, patch, 'Alert');
  }
}

class JsonNotificationRepository implements NotificationRepository {
  async listByTenant(tenantId: string): Promise<Notification[]> {
    return getDataset().notifications.filter((n) => n.tenantId === tenantId);
  }

  async findById(tenantId: string, id: string): Promise<Notification | undefined> {
    return getDataset().notifications.find((n) => n.id === id && n.tenantId === tenantId);
  }

  async update(tenantId: string, id: string, patch: Partial<Notification>): Promise<Notification> {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundError('Notification');
    return replaceIn(getDataset().notifications, id, patch, 'Notification');
  }

  async markAllRead(tenantId: string): Promise<number> {
    const items = getDataset().notifications;
    let changed = 0;
    items.forEach((item, index) => {
      if (item.tenantId === tenantId && !item.read) {
        items[index] = { ...item, read: true };
        changed += 1;
      }
    });
    return changed;
  }

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences | undefined> {
    return getDataset().notificationPreferences.find(
      (p) => p.tenantId === tenantId && p.userId === userId,
    );
  }

  async savePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
    const all = getDataset().notificationPreferences;
    const index = all.findIndex((p) => p.tenantId === prefs.tenantId && p.userId === prefs.userId);
    if (index === -1) {
      all.push(prefs);
    } else {
      all[index] = prefs;
    }
    return prefs;
  }
}

class JsonReportRepository implements ReportRepository {
  async listByTenant(tenantId: string): Promise<SavedReport[]> {
    return getDataset().reports.filter((r) => r.tenantId === tenantId);
  }

  async findById(tenantId: string, id: string): Promise<SavedReport | undefined> {
    return getDataset().reports.find((r) => r.id === id && r.tenantId === tenantId);
  }

  async create(report: SavedReport): Promise<SavedReport> {
    getDataset().reports.unshift(report);
    return report;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const reports = getDataset().reports;
    const index = reports.findIndex((r) => r.id === id && r.tenantId === tenantId);
    if (index === -1) throw new NotFoundError('Report');
    reports.splice(index, 1);
  }
}

class JsonSupportRepository implements SupportRepository {
  async listByTenant(tenantId: string): Promise<SupportTicket[]> {
    return getDataset().tickets.filter((t) => t.tenantId === tenantId);
  }

  async findById(tenantId: string, id: string): Promise<SupportTicket | undefined> {
    return getDataset().tickets.find((t) => t.id === id && t.tenantId === tenantId);
  }

  async create(ticket: SupportTicket): Promise<SupportTicket> {
    getDataset().tickets.unshift(ticket);
    return ticket;
  }

  async update(tenantId: string, id: string, patch: Partial<SupportTicket>): Promise<SupportTicket> {
    const existing = await this.findById(tenantId, id);
    if (!existing) throw new NotFoundError('Ticket');
    return replaceIn(getDataset().tickets, id, patch, 'Ticket');
  }

  async listArticles(): Promise<HelpArticle[]> {
    return getDataset().articles;
  }

  async findArticle(slug: string): Promise<HelpArticle | undefined> {
    return getDataset().articles.find((a) => a.slug === slug);
  }
}

class JsonMonitoringRepository implements MonitoringRepository {
  async getByTenant(tenantId: string): Promise<MonitoringData | undefined> {
    return getDataset().monitoring[tenantId];
  }
}

export function createJsonRepositories(): RepositoryBundle {
  return {
    tenants: new JsonTenantRepository(),
    users: new JsonUserRepository(),
    cases: new JsonCaseRepository(),
    alerts: new JsonAlertRepository(),
    notifications: new JsonNotificationRepository(),
    reports: new JsonReportRepository(),
    support: new JsonSupportRepository(),
    monitoring: new JsonMonitoringRepository(),
  };
}
