import type { Tenant } from '@peppermill/shared';

/**
 * Tenant records.
 *
 * PepperMill is the branded tenant this portal was built for; the other two
 * exist to prove the point of a white label — every colour, wordmark and
 * enabled feature below is data, and the React client renders all three from
 * exactly the same component tree.
 */

const OPEN_SANS = "'Open Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";

/**
 * Wordmarks are inline SVG so a tenant needs no asset pipeline, no CDN and no
 * upload step to be onboarded — the whole brand travels in one JSON record.
 * `currentColor` lets the mark inherit whatever surface it sits on.
 */
const PEPPERMILL_WORDMARK = (color: string, sparkle: string) => `
<svg viewBox="0 0 200 34" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PepperMill">
  <text x="0" y="26" font-family="Georgia, 'Times New Roman', serif" font-size="27" font-weight="700" fill="${color}">PepperMill</text>
  <path d="M176 7 l1.9 4.4 4.4 1.9 -4.4 1.9 -1.9 4.4 -1.9 -4.4 -4.4 -1.9 4.4 -1.9z" fill="${sparkle}"/>
  <path d="M186 2 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2z" fill="${sparkle}"/>
</svg>`.trim();

const PEPPERMILL_MARK = (color: string, sparkle: string) => `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PepperMill">
  <text x="1" y="32" font-family="Georgia, 'Times New Roman', serif" font-size="34" font-weight="700" fill="${color}">P</text>
  <path d="M28 5 l1.7 3.9 3.9 1.7 -3.9 1.7 -1.7 3.9 -1.7 -3.9 -3.9 -1.7 3.9 -1.7z" fill="${sparkle}"/>
</svg>`.trim();

const GENERIC_WORDMARK = (label: string, color: string, accent: string) => `
<svg viewBox="0 0 200 34" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
  <rect x="0" y="8" width="18" height="18" rx="4" fill="${accent}"/>
  <text x="26" y="25" font-family="'Open Sans', system-ui, sans-serif" font-size="20" font-weight="800" fill="${color}">${label}</text>
</svg>`.trim();

const GENERIC_MARK = (initial: string, color: string, accent: string) => `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${initial}">
  <rect x="0" y="0" width="40" height="40" rx="10" fill="${accent}"/>
  <text x="20" y="28" text-anchor="middle" font-family="'Open Sans', system-ui, sans-serif" font-size="22" font-weight="800" fill="${color}">${initial}</text>
</svg>`.trim();

const NOW = '2026-01-30T00:00:00.000Z';

export const TENANTS: Tenant[] = [
  {
    id: 'tenant_peppermill',
    slug: 'peppermill',
    name: 'PepperMill',
    legalName: 'Peppermill Antiques Ltd',
    tagline: 'Chargeback Management',
    poweredBy: 'Powered by Chargebacks911',
    supportEmail: 'support@peppermill.example',
    supportPhone: '+44 1543 375 872',
    primaryDomain: 'disputes.peppermill.example',
    locale: 'en-GB',
    defaultCurrency: 'GBP',
    timezone: 'Europe/London',
    // Straight from the 01.30.25 design system.
    palette: {
      primary: '#515190', // bright plum
      primaryDark: '#4B445E', // dark plum
      primaryMuted: '#8586AF', // medium plum
      primarySoft: '#A8A8C7', // light plum
      primarySurface: '#F2F0F5', // lightest plum
      accent: '#FAA31F', // orange
      success: '#2E7D5B',
      warning: '#FAA31F',
      danger: '#C0392B',
      info: '#515190',
    },
    typography: {
      fontFamily: OPEN_SANS,
      displayFontFamily: "Georgia, 'Times New Roman', serif",
    },
    assets: {
      logo: PEPPERMILL_WORDMARK('#515190', '#FAA31F'),
      logoInverse: PEPPERMILL_WORDMARK('#FFFFFF', '#FAA31F'),
      mark: PEPPERMILL_MARK('#515190', '#FAA31F'),
    },
    radius: 'soft',
    features: {
      cases: true,
      alerts: true,
      analytics: true,
      notifications: true,
      monitoring: true,
      userManagement: true,
      support: true,
      selfServeBranding: true,
      representments: true,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'tenant_cb911',
    slug: 'chargebacks911',
    name: 'Chargebacks911',
    legalName: 'Chargebacks911 LLC',
    tagline: 'Dispute Operations Console',
    poweredBy: 'Chargebacks911 Platform',
    supportEmail: 'support@chargebacks911.com',
    supportPhone: '+1 877 634 9808',
    primaryDomain: 'portal.chargebacks911.com',
    locale: 'en-US',
    defaultCurrency: 'USD',
    timezone: 'America/New_York',
    palette: {
      primary: '#4B445E',
      primaryDark: '#333333',
      primaryMuted: '#8586AF',
      primarySoft: '#A8A8C7',
      primarySurface: '#F7F7F7',
      accent: '#FAA31F',
      success: '#2E7D5B',
      warning: '#FAA31F',
      danger: '#C0392B',
      info: '#515190',
    },
    typography: {
      fontFamily: OPEN_SANS,
      displayFontFamily: OPEN_SANS,
    },
    assets: {
      logo: GENERIC_WORDMARK('CB911', '#333333', '#FAA31F'),
      logoInverse: GENERIC_WORDMARK('CB911', '#FFFFFF', '#FAA31F'),
      mark: GENERIC_MARK('C', '#FFFFFF', '#4B445E'),
    },
    radius: 'sharp',
    features: {
      cases: true,
      alerts: true,
      analytics: true,
      notifications: true,
      monitoring: true,
      userManagement: true,
      support: true,
      selfServeBranding: true,
      representments: true,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    /**
     * A deliberately cut-down tenant: different palette, rounder geometry, and
     * several features switched off. Selecting it in the theme switcher makes
     * nav items disappear, which is the clearest demonstration that the
     * feature flags are load-bearing rather than decorative.
     */
    id: 'tenant_northwind',
    slug: 'northwind',
    name: 'Northwind Retail',
    legalName: 'Northwind Retail Group Inc.',
    tagline: 'Dispute Centre',
    poweredBy: 'Powered by Chargebacks911',
    supportEmail: 'disputes@northwind.example',
    supportPhone: '+1 415 555 0142',
    primaryDomain: 'disputes.northwind.example',
    locale: 'en-US',
    defaultCurrency: 'USD',
    timezone: 'America/Los_Angeles',
    palette: {
      primary: '#0F766E',
      primaryDark: '#134E4A',
      primaryMuted: '#5EAAA3',
      primarySoft: '#A7D5D0',
      primarySurface: '#EFF7F6',
      accent: '#F97316',
      success: '#2E7D5B',
      warning: '#F97316',
      danger: '#C0392B',
      info: '#0F766E',
    },
    typography: {
      fontFamily: OPEN_SANS,
      displayFontFamily: OPEN_SANS,
    },
    assets: {
      logo: GENERIC_WORDMARK('Northwind', '#134E4A', '#F97316'),
      logoInverse: GENERIC_WORDMARK('Northwind', '#FFFFFF', '#F97316'),
      mark: GENERIC_MARK('N', '#FFFFFF', '#0F766E'),
    },
    radius: 'round',
    features: {
      cases: true,
      alerts: false,
      analytics: true,
      notifications: true,
      monitoring: false,
      userManagement: true,
      support: true,
      selfServeBranding: false,
      representments: true,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const DEFAULT_TENANT_SLUG = 'peppermill';
