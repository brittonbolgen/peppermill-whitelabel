export const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover'] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];

export interface CardBrandMeta {
  id: CardBrand;
  label: string;
  /** Brand colour, used only for the card chip in tables and detail headers. */
  color: string;
  /**
   * Chargeback-ratio ceiling the network enforces before a merchant enters a
   * monitoring programme. Drives the threshold markers on the analytics gauge.
   */
  monitoringThreshold: number;
  thresholdProgramme: string;
}

export const CARD_BRAND_META: Record<CardBrand, CardBrandMeta> = {
  visa: {
    id: 'visa',
    label: 'Visa',
    color: '#1A1F71',
    monitoringThreshold: 0.009,
    thresholdProgramme: 'VAMP',
  },
  mastercard: {
    id: 'mastercard',
    label: 'Mastercard',
    color: '#EB001B',
    monitoringThreshold: 0.015,
    thresholdProgramme: 'ECP',
  },
  amex: {
    id: 'amex',
    label: 'American Express',
    color: '#006FCF',
    monitoringThreshold: 0.01,
    thresholdProgramme: 'Amex Monitoring',
  },
  discover: {
    id: 'discover',
    label: 'Discover',
    color: '#FF6000',
    monitoringThreshold: 0.01,
    thresholdProgramme: 'Discover Monitoring',
  },
};
