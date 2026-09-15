/**
 * Multi-currency support for transaction limits and reporting.
 *
 * IMPORTANT — production readiness:
 * EXCHANGE_RATES below are static placeholders captured at development time.
 * They are NOT live rates. Before this reaches production, wire in a real,
 * audited FX rate provider (e.g. the ECB reference rates API, or a paid
 * provider with an SLA) and refresh rates on a documented schedule. Using
 * stale static rates to gate real transaction limits is a compliance risk.
 */

export const BASE_CURRENCY = 'EUR';

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'MXN' | 'COP';

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'COP'];

// Units of each currency per 1 EUR. Snapshot values — see warning above.
const EXCHANGE_RATES_PER_EUR: Record<SupportedCurrency, number> = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  CHF: 0.95,
  MXN: 18.5,
  COP: 4300,
};

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as string[]).includes(currency);
}

function assertSupported(currency: string): asserts currency is SupportedCurrency {
  if (!isSupportedCurrency(currency)) {
    throw new Error(
      `Unsupported currency "${currency}". Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`,
    );
  }
}

/** Converts an amount in `currency` to the base currency (EUR). */
export function convertToBase(amount: number, currency: string): number {
  assertSupported(currency);
  return amount / EXCHANGE_RATES_PER_EUR[currency];
}

/** Converts an amount in the base currency (EUR) to `currency`. */
export function convertFromBase(amountInBase: number, currency: string): number {
  assertSupported(currency);
  return amountInBase * EXCHANGE_RATES_PER_EUR[currency];
}

/** Converts an amount directly between two supported currencies. */
export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  return convertFromBase(convertToBase(amount, from), to);
}

export function formatCurrency(amount: number, currency: string): string {
  assertSupported(currency);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
