import { MockProviderClient } from './mock-base-client';
import { FinancialProviderConfig } from './types';

/**
 * Mock Stripe client — simulates charge creation for fiat payments.
 *
 * To go live: replace with the real `stripe` npm package, initialized with
 * a restricted API key from environment (never hardcoded), and start with
 * a `sk_test_...` test-mode key before ever touching a live key.
 */
export class StripeMockClient extends MockProviderClient {
  constructor(config: FinancialProviderConfig = { mode: 'mock' }) {
    super('Stripe', 'payment', config.initialBalances ?? { USD: 0, EUR: 0 });
  }
}
