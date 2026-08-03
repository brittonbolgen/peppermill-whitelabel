import type {
  Notification,
  NotificationListQuery,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationStats,
  Paginated,
} from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { paginate, searchItems, sortItems } from '../utils/pagination.js';

const SEARCH_FIELDS = ['title', 'body'];

export const notificationService = {
  async list(tenantId: string, query: NotificationListQuery): Promise<Paginated<Notification>> {
    const all = await repositories.notifications.listByTenant(tenantId);

    let filtered = all.filter((item) => {
      if (query.category && item.category !== query.category) return false;
      if (query.severity && item.severity !== query.severity) return false;
      if (query.unreadOnly && item.read) return false;
      return true;
    });

    filtered = searchItems(filtered, query.search, SEARCH_FIELDS);
    filtered = sortItems(filtered, query.sort ?? 'createdAt', query.order);

    return paginate(filtered, query);
  },

  async markRead(tenantId: string, id: string, read: boolean): Promise<Notification> {
    const existing = await repositories.notifications.findById(tenantId, id);
    if (!existing) throw new NotFoundError('Notification');
    return repositories.notifications.update(tenantId, id, { read });
  },

  async markAllRead(tenantId: string): Promise<{ updated: number }> {
    const updated = await repositories.notifications.markAllRead(tenantId);
    return { updated };
  },

  async stats(tenantId: string): Promise<NotificationStats> {
    const all = await repositories.notifications.listByTenant(tenantId);
    return {
      total: all.length,
      unread: all.filter((n) => !n.read).length,
      // Unread criticals drive the badge colour, not the raw count — a read
      // security warning should not keep the bell glowing red.
      critical: all.filter((n) => n.severity === 'critical' && !n.read).length,
    };
  },

  async getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences> {
    const prefs = await repositories.notifications.getPreferences(tenantId, userId);
    if (!prefs) throw new NotFoundError('Notification preferences');
    return prefs;
  },

  async updatePreferences(
    tenantId: string,
    userId: string,
    patch: NotificationPreferencesUpdate,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(tenantId, userId);
    return repositories.notifications.savePreferences({ ...current, ...patch });
  },
};
