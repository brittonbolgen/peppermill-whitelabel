import type { Currency, Money } from '../schemas/common.js';

/**
 * Money helpers.
 *
 * Amounts travel as integer minor units everywhere in the system. These two
 * functions are the only places that convert to and from a display value, so
 * rounding behaviour is defined exactly once.
 */

export function money(amount: number, currency: Currency = 'USD'): Money {
  return { amount: Math.round(amount), currency };
}

export function fromMajorUnits(value: number, currency: Currency = 'USD'): Money {
  return { amount: Math.round(value * 100), currency };
}

export function toMajorUnits(value: Money): number {
  return value.amount / 100;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} to ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function sumMoney(values: Money[], fallbackCurrency: Currency = 'USD'): Money {
  if (values.length === 0) return { amount: 0, currency: fallbackCurrency };
  return values.reduce((acc, v) => addMoney(acc, v));
}

export interface FormatMoneyOptions {
  locale?: string;
  /** Drops the decimal places — useful for axis labels and KPI tiles. */
  compact?: boolean;
  /** Renders 1_250_000 as "1.3M". */
  notation?: 'standard' | 'compact';
}

export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  const { locale = 'en-US', compact = false, notation = 'standard' } = options;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency,
    notation,
    maximumFractionDigits: compact || notation === 'compact' ? 0 : 2,
    minimumFractionDigits: compact || notation === 'compact' ? 0 : 2,
  }).format(toMajorUnits(value));
}

export function formatPercent(value: number, fractionDigits = 1, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}
