import type { Tenant, TenantBrandingUpdate, TenantSummary } from '@peppermill/shared';

import { repositories } from '../repositories/index.js';
import { NotFoundError } from '../utils/errors.js';
import { toIso } from '../utils/dates.js';

/**
 * Tenant service.
 *
 * The branding update merges rather than replaces nested objects, so an editor
 * that sends only the two colours the user actually changed does not wipe the
 * rest of the palette.
 */
export const tenantService = {
  async list(): Promise<TenantSummary[]> {
    const tenants = await repositories.tenants.list();
    return tenants.map(({ id, slug, name, tagline }) => ({ id, slug, name, tagline }));
  },

  async getById(id: string): Promise<Tenant> {
    const tenant = await repositories.tenants.findById(id);
    if (!tenant) throw new NotFoundError('Tenant');
    return tenant;
  },

  async getBySlug(slug: string): Promise<Tenant> {
    const tenant = await repositories.tenants.findBySlug(slug);
    if (!tenant) throw new NotFoundError('Tenant');
    return tenant;
  },

  async updateBranding(id: string, patch: TenantBrandingUpdate): Promise<Tenant> {
    const current = await this.getById(id);

    return repositories.tenants.update(id, {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.tagline !== undefined && { tagline: patch.tagline }),
      ...(patch.poweredBy !== undefined && { poweredBy: patch.poweredBy }),
      ...(patch.supportEmail !== undefined && { supportEmail: patch.supportEmail }),
      ...(patch.supportPhone !== undefined && { supportPhone: patch.supportPhone }),
      ...(patch.radius !== undefined && { radius: patch.radius }),
      palette: { ...current.palette, ...patch.palette },
      typography: { ...current.typography, ...patch.typography },
      features: { ...current.features, ...patch.features },
      updatedAt: toIso(new Date()),
    });
  },
};
