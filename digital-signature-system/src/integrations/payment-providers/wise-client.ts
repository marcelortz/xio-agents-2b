import { MockProviderClient } from './mock-base-client';
import { FinancialProviderConfig } from './types';
import { convertCurrency, isSupportedCurrency } from '../../utils/currency';

export interface WiseQuote {
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  /** Flat mock fee, in source currency. Real Wise fees are tiered — this is illustrative only. */
  fee: number;
}

/**
 * Mock Wise client — simulates the real Wise flow of quoting a currency
 * conversion before creating the transfer.
 *
 * To go live: use Wise's real sandbox host (api.sandbox.transferwise.tech)
 * with a sandbox API token before ever pointing at the production API.
 */
export class WiseMockClient extends MockProviderClient {
  constructor(config: FinancialProviderConfig = { mode: 'mock' }) {
    super('Wise', 'transfer', config.initialBalances ?? { EUR: 0, USD: 0, GBP: 0 });
  }

  /** Quotes a cross-currency transfer using the same rates as the rest of the system. */
  getQuote(sourceAmount: number, sourceCurrency: string, targetCurrency: string): WiseQuote {
    if (!isSupportedCurrency(sourceCurrency) || !isSupportedCurrency(targetCurrency)) {
      throw new Error(`Unsupported currency pair: ${sourceCurrency} -> ${targetCurrency}`);
    }
    const fee = sourceAmount * 0.005; // flat 0.5% mock fee
    const targetAmount = convertCurrency(sourceAmount - fee, sourceCurrency, targetCurrency);
    return { sourceAmount, sourceCurrency, targetAmount, targetCurrency, fee };
  }
}
