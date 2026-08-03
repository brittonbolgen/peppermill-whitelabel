import type { Paginated, PaginationQuery, User, UserCreate, UserUpdate } from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { paginate, searchItems, sortItems } from '../utils/pagination.js';
import { toIso } from '../utils/dates.js';
import { AVATAR_COLORS } from '../data/catalog.js';

const SEARCH_FIELDS = ['name', 'email', 'jobTitle', 'department'];

export const userService = {
  async list(tenantId: string, query: PaginationQuery): Promise<Paginated<User>> {
    const all = await repositories.users.listByTenant(tenantId);
    const filtered = sortItems(
      searchItems(all, query.search, SEARCH_FIELDS),
      query.sort ?? 'name',
      query.sort ? query.order : 'asc',
    );
    return paginate(filtered, query);
  },

  async getById(tenantId: string, id: string): Promise<User> {
    const user = await repositories.users.findById(id);
    if (!user || user.tenantId !== tenantId) throw new NotFoundError('User');
    return user;
  },

  async create(tenantId: string, input: UserCreate): Promise<User> {
    const existing = await repositories.users.findByEmail(tenantId, input.email);
    if (existing) throw new ConflictError('Someone with that email address is already invited');

    const members = await repositories.users.listByTenant(tenantId);

    return repositories.users.create({
      id: `usr_${Date.now().toString(36)}`,
      tenantId,
      name: input.name,
      email: input.email,
      role: input.role,
      // New members start as invited; they become active on first sign-in.
      status: 'invited',
      jobTitle: input.jobTitle,
      department: input.department,
      avatarColor: AVATAR_COLORS[members.length % AVATAR_COLORS.length] as string,
      mfaEnabled: false,
      lastActiveAt: null,
      createdAt: toIso(new Date()),
    });
  },

  async update(tenantId: string, id: string, patch: UserUpdate, actor: User): Promise<User> {
    const target = await this.getById(tenantId, id);

    // A workspace that loses its last owner cannot be administered again, so
    // the final owner may not be demoted or suspended — including by themselves.
    const losingOwner =
      target.role === 'owner' &&
      ((patch.role !== undefined && patch.role !== 'owner') ||
        (patch.status !== undefined && patch.status !== 'active'));

    if (losingOwner) {
      const owners = (await repositories.users.listByTenant(tenantId)).filter(
        (u) => u.role === 'owner' && u.status === 'active',
      );
      if (owners.length <= 1) {
        throw new ForbiddenError('A workspace must keep at least one active owner');
      }
    }

    if (patch.email && patch.email !== target.email) {
      const clash = await repositories.users.findByEmail(tenantId, patch.email);
      if (clash) throw new ConflictError('Another member already uses that email address');
    }

    if (patch.role && patch.role !== target.role && actor.role !== 'owner' && patch.role === 'owner') {
      throw new ForbiddenError('Only an owner can grant the owner role');
    }

    return repositories.users.update(id, patch);
  },

  async remove(tenantId: string, id: string, actor: User): Promise<void> {
    const target = await this.getById(tenantId, id);

    if (target.id === actor.id) {
      throw new ForbiddenError('You cannot remove your own account');
    }

    if (target.role === 'owner') {
      const owners = (await repositories.users.listByTenant(tenantId)).filter(
        (u) => u.role === 'owner' && u.status === 'active',
      );
      if (owners.length <= 1) {
        throw new ForbiddenError('A workspace must keep at least one active owner');
      }
    }

    await repositories.users.remove(id);
  },
};
