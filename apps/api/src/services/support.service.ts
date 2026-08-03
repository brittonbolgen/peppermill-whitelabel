import type {
  HelpArticle,
  Paginated,
  SupportOverview,
  SupportTicket,
  TicketCreate,
  TicketListQuery,
  TicketReply,
  User,
} from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { paginate, searchItems, sortItems } from '../utils/pagination.js';
import { toIso } from '../utils/dates.js';

const SEARCH_FIELDS = ['ticketNumber', 'subject', 'requesterName'];

export const supportService = {
  async listTickets(tenantId: string, query: TicketListQuery): Promise<Paginated<SupportTicket>> {
    const all = await repositories.support.listByTenant(tenantId);

    let filtered = all.filter((t) => {
      if (query.status && t.status !== query.status) return false;
      if (query.priority && t.priority !== query.priority) return false;
      if (query.category && t.category !== query.category) return false;
      return true;
    });

    filtered = searchItems(filtered, query.search, SEARCH_FIELDS);
    filtered = sortItems(filtered, query.sort ?? 'updatedAt', query.order);

    return paginate(filtered, query);
  },

  async getTicket(tenantId: string, id: string): Promise<SupportTicket> {
    const ticket = await repositories.support.findById(tenantId, id);
    if (!ticket) throw new NotFoundError('Ticket');
    return ticket;
  },

  async createTicket(tenantId: string, input: TicketCreate, actor: User): Promise<SupportTicket> {
    const existing = await repositories.support.listByTenant(tenantId);
    const now = toIso(new Date());

    return repositories.support.create({
      id: `tkt_${Date.now().toString(36)}`,
      tenantId,
      ticketNumber: `SUP-${String(4200 + existing.length + 1).padStart(5, '0')}`,
      subject: input.subject,
      status: 'open',
      priority: input.priority,
      category: input.category,
      relatedCaseId: input.relatedCaseId,
      requesterName: actor.name,
      requesterEmail: actor.email,
      assigneeName: null,
      messages: [
        {
          id: `msg_${Date.now().toString(36)}`,
          author: actor.name,
          authorType: 'merchant',
          body: input.body,
          createdAt: now,
        },
      ],
      slaResponseHours: input.priority === 'urgent' ? 2 : input.priority === 'high' ? 4 : 12,
      firstRespondedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  },

  async reply(
    tenantId: string,
    id: string,
    input: TicketReply,
    actor: User,
  ): Promise<SupportTicket> {
    const ticket = await this.getTicket(tenantId, id);

    if (ticket.status === 'closed') {
      throw new BadRequestError('This ticket is closed. Open a new one to continue.');
    }

    const now = toIso(new Date());

    return repositories.support.update(tenantId, id, {
      // A merchant reply on a resolved ticket reopens it rather than
      // disappearing into a closed thread.
      status: ticket.status === 'resolved' ? 'open' : ticket.status,
      messages: [
        ...ticket.messages,
        {
          id: `msg_${Date.now().toString(36)}`,
          author: actor.name,
          authorType: 'merchant',
          body: input.body,
          createdAt: now,
        },
      ],
      updatedAt: now,
    });
  },

  async closeTicket(tenantId: string, id: string): Promise<SupportTicket> {
    await this.getTicket(tenantId, id);
    return repositories.support.update(tenantId, id, {
      status: 'closed',
      updatedAt: toIso(new Date()),
    });
  },

  async listArticles(search?: string): Promise<HelpArticle[]> {
    const articles = await repositories.support.listArticles();
    return searchItems(articles, search, ['title', 'summary', 'category', 'body']);
  },

  async getArticle(slug: string): Promise<HelpArticle> {
    const article = await repositories.support.findArticle(slug);
    if (!article) throw new NotFoundError('Article');
    return article;
  },

  async overview(tenantId: string): Promise<SupportOverview> {
    const tickets = await repositories.support.listByTenant(tenantId);

    const responded = tickets.filter((t) => t.firstRespondedAt);
    const responseHours = responded.map(
      (t) =>
        (new Date(t.firstRespondedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000,
    );

    return {
      openTickets: tickets.filter((t) => t.status === 'open').length,
      pendingTickets: tickets.filter((t) => t.status === 'pending').length,
      avgFirstResponseHours:
        responseHours.length === 0
          ? 0
          : Number(
              (responseHours.reduce((sum, h) => sum + h, 0) / responseHours.length).toFixed(1),
            ),
      satisfactionScore: 4.6,
      accountManager: {
        name: 'Elena Marsh',
        email: 'elena.marsh@chargebacks911.com',
        phone: '+1 877 634 9808',
        timezone: 'America/New_York',
      },
    };
  },
};
