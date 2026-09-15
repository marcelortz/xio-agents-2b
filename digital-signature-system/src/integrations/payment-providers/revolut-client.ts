import { MockProviderClient } from './mock-base-client';
import { FinancialProviderConfig } from './types';

/**
 * Mock Revolut Business client — simulates multi-currency transfers.
 *
 * To go live: use Revolut Business's real sandbox host
 * (sandbox-b2b.revolut.com) with OAuth2 credentials before ever pointing at
 * the production API.
 */
export class RevolutMockClient extends MockProviderClient {
  constructor(config: FinancialProviderConfig = { mode: 'mock' }) {
    super('Revolut', 'transfer', config.initialBalances ?? { EUR: 0, GBP: 0, USD: 0 });
  }
}
