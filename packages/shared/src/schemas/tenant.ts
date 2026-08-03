import { z } from 'zod';

/**
 * Tenant branding.
 *
 * This object is the whole white-label contract. The web client turns it into
 * CSS custom properties at runtime, so onboarding a new brand is a data change
 * — a new tenant record — and never a code change or a rebuild.
 */

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour such as #515190');

export const brandPaletteSchema = z.object({
  /** Primary action colour. PepperMill: bright plum. */
  primary: hexColor,
  /** Darker primary, used for the sidebar and headers. */
  primaryDark: hexColor,
  /** Mid tint, used for muted primary text and chart series. */
  primaryMuted: hexColor,
  /** Light tint, used for hovers and selected rows. */
  primarySoft: hexColor,
  /** Lightest tint, used for page and panel surfaces. */
  primarySurface: hexColor,
  /** Accent colour for highlights, warnings and calls to attention. */
  accent: hexColor,
  /** Semantic colours, overridable per tenant. */
  success: hexColor,
  warning: hexColor,
  danger: hexColor,
  info: hexColor,
});
export type BrandPalette = z.infer<typeof brandPaletteSchema>;

export const brandTypographySchema = z.object({
  /** Family used for body copy and UI chrome. */
  fontFamily: z.string().min(1),
  /** Family used for the wordmark and display headings. */
  displayFontFamily: z.string().min(1),
  /** Optional stylesheet URL for a self-hosted or CDN-served webfont. */
  fontUrl: z.string().url().optional(),
});
export type BrandTypography = z.infer<typeof brandTypographySchema>;

export const brandAssetsSchema = z.object({
  /** Inline SVG or URL for the full wordmark on light surfaces. */
  logo: z.string().min(1),
  /** Wordmark variant for dark surfaces such as the sidebar. */
  logoInverse: z.string().min(1),
  /** Square glyph used for the favicon and collapsed sidebar. */
  mark: z.string().min(1),
});
export type BrandAssets = z.infer<typeof brandAssetsSchema>;

export const brandRadiusSchema = z.enum(['sharp', 'soft', 'round']);
export type BrandRadius = z.infer<typeof brandRadiusSchema>;

/**
 * Feature flags.
 *
 * Every navigable surface is gated here, so a tenant can be sold a subset of
 * the platform without forking the front end. Unknown future flags can be
 * added without breaking existing tenant records because each defaults.
 */
export const tenantFeaturesSchema = z.object({
  cases: z.boolean().default(true),
  alerts: z.boolean().default(true),
  analytics: z.boolean().default(true),
  notifications: z.boolean().default(true),
  monitoring: z.boolean().default(true),
  userManagement: z.boolean().default(true),
  support: z.boolean().default(true),
  /** Lets tenant admins edit their own branding from Settings. */
  selfServeBranding: z.boolean().default(true),
  /** Exposes the representment builder on case detail. */
  representments: z.boolean().default(true),
});
export type TenantFeatures = z.infer<typeof tenantFeaturesSchema>;

export const tenantSchema = z.object({
  id: z.string().min(1),
  /** URL-safe key used in the X-Tenant-Id header and the theme switcher. */
  slug: z.string().min(1),
  name: z.string().min(1),
  legalName: z.string().min(1),
  /** Shown under the wordmark, e.g. "Chargeback Management". */
  tagline: z.string(),
  /** Attribution line in the footer — the "powered by" of white labelling. */
  poweredBy: z.string(),
  supportEmail: z.string().email(),
  supportPhone: z.string(),
  primaryDomain: z.string(),
  locale: z.string().default('en-US'),
  defaultCurrency: z.string().default('USD'),
  timezone: z.string().default('America/New_York'),
  palette: brandPaletteSchema,
  typography: brandTypographySchema,
  assets: brandAssetsSchema,
  radius: brandRadiusSchema.default('soft'),
  features: tenantFeaturesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tenant = z.infer<typeof tenantSchema>;

/** Payload accepted by the in-app branding editor. */
export const tenantBrandingUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  poweredBy: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  palette: brandPaletteSchema.partial().optional(),
  typography: brandTypographySchema.partial().optional(),
  radius: brandRadiusSchema.optional(),
  features: tenantFeaturesSchema.partial().optional(),
});
export type TenantBrandingUpdate = z.infer<typeof tenantBrandingUpdateSchema>;

/** Lightweight tenant record for the login-screen brand picker. */
export const tenantSummarySchema = tenantSchema.pick({
  id: true,
  slug: true,
  name: true,
  tagline: true,
});
export type TenantSummary = z.infer<typeof tenantSummarySchema>;
