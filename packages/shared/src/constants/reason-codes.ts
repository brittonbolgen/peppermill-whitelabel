import type { CardBrand } from './card-brands.js';

/**
 * Chargeback reason codes.
 *
 * Grouping every network's codes under four shared categories lets the
 * analytics surfaces report on cause rather than on network-specific numbering,
 * which is what a merchant actually needs in order to act.
 */

export const REASON_CATEGORIES = ['fraud', 'authorization', 'processing', 'consumer'] as const;
export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

export interface ReasonCategoryMeta {
  id: ReasonCategory;
  label: string;
  description: string;
  /** Guidance surfaced in the representment builder. */
  recommendedEvidence: string[];
}

export const REASON_CATEGORY_META: Record<ReasonCategory, ReasonCategoryMeta> = {
  fraud: {
    id: 'fraud',
    label: 'Fraud',
    description: 'Cardholder claims the transaction was not authorised by them.',
    recommendedEvidence: [
      'AVS and CVV match results',
      'Device fingerprint and IP geolocation',
      'Proof of prior undisputed transactions',
      'Signed delivery confirmation',
    ],
  },
  authorization: {
    id: 'authorization',
    label: 'Authorization',
    description: 'The authorisation was declined, expired or never obtained.',
    recommendedEvidence: [
      'Authorisation approval code',
      'Transaction timestamp and settlement record',
      'Processor authorisation log',
    ],
  },
  processing: {
    id: 'processing',
    label: 'Processing Error',
    description: 'Duplicate, incorrect amount, or late presentment.',
    recommendedEvidence: [
      'Original and duplicate transaction records',
      'Itemised invoice showing the correct amount',
      'Refund or credit issuance proof',
    ],
  },
  consumer: {
    id: 'consumer',
    label: 'Consumer Dispute',
    description: 'Goods or services not received, not as described, or cancelled.',
    recommendedEvidence: [
      'Proof of delivery with tracking',
      'Terms and conditions accepted at checkout',
      'Refund and cancellation policy',
      'Customer service correspondence',
    ],
  },
};

export interface ReasonCode {
  code: string;
  network: CardBrand;
  title: string;
  category: ReasonCategory;
  /** Representment window in days from the chargeback date. */
  responseWindowDays: number;
}

export const REASON_CODES: ReasonCode[] = [
  // Visa
  { code: '10.4', network: 'visa', title: 'Other Fraud — Card Absent Environment', category: 'fraud', responseWindowDays: 30 },
  { code: '10.3', network: 'visa', title: 'Other Fraud — Card Present Environment', category: 'fraud', responseWindowDays: 30 },
  { code: '11.3', network: 'visa', title: 'No Authorization', category: 'authorization', responseWindowDays: 30 },
  { code: '12.5', network: 'visa', title: 'Incorrect Amount', category: 'processing', responseWindowDays: 30 },
  { code: '12.6', network: 'visa', title: 'Duplicate Processing', category: 'processing', responseWindowDays: 30 },
  { code: '13.1', network: 'visa', title: 'Merchandise / Services Not Received', category: 'consumer', responseWindowDays: 30 },
  { code: '13.3', network: 'visa', title: 'Not as Described or Defective Merchandise', category: 'consumer', responseWindowDays: 30 },
  { code: '13.6', network: 'visa', title: 'Credit Not Processed', category: 'consumer', responseWindowDays: 30 },
  { code: '13.7', network: 'visa', title: 'Cancelled Merchandise / Services', category: 'consumer', responseWindowDays: 30 },

  // Mastercard
  { code: '4837', network: 'mastercard', title: 'No Cardholder Authorization', category: 'fraud', responseWindowDays: 45 },
  { code: '4849', network: 'mastercard', title: 'Questionable Merchant Activity', category: 'fraud', responseWindowDays: 45 },
  { code: '4808', network: 'mastercard', title: 'Authorization-Related Chargeback', category: 'authorization', responseWindowDays: 45 },
  { code: '4834', network: 'mastercard', title: 'Point-of-Interaction Error', category: 'processing', responseWindowDays: 45 },
  { code: '4853', network: 'mastercard', title: 'Cardholder Dispute', category: 'consumer', responseWindowDays: 45 },
  { code: '4855', network: 'mastercard', title: 'Goods or Services Not Provided', category: 'consumer', responseWindowDays: 45 },

  // American Express
  { code: 'F29', network: 'amex', title: 'Card Not Present', category: 'fraud', responseWindowDays: 20 },
  { code: 'F24', network: 'amex', title: 'No Cardmember Authorization', category: 'fraud', responseWindowDays: 20 },
  { code: 'A01', network: 'amex', title: 'Charge Amount Exceeds Authorization', category: 'authorization', responseWindowDays: 20 },
  { code: 'P08', network: 'amex', title: 'Duplicate Charge', category: 'processing', responseWindowDays: 20 },
  { code: 'C08', network: 'amex', title: 'Goods / Services Not Received', category: 'consumer', responseWindowDays: 20 },
  { code: 'C31', network: 'amex', title: 'Goods / Services Not as Described', category: 'consumer', responseWindowDays: 20 },

  // Discover
  { code: 'UA02', network: 'discover', title: 'Fraud — Card Not Present', category: 'fraud', responseWindowDays: 30 },
  { code: 'AT', network: 'discover', title: 'Authorization Non-Compliance', category: 'authorization', responseWindowDays: 30 },
  { code: 'DP', network: 'discover', title: 'Duplicate Processing', category: 'processing', responseWindowDays: 30 },
  { code: 'RM', network: 'discover', title: 'Cardholder Disputes Quality of Goods', category: 'consumer', responseWindowDays: 30 },
];

export function findReasonCode(code: string, network: CardBrand): ReasonCode | undefined {
  return REASON_CODES.find((r) => r.code === code && r.network === network);
}

export function reasonCodesForNetwork(network: CardBrand): ReasonCode[] {
  return REASON_CODES.filter((r) => r.network === network);
}
