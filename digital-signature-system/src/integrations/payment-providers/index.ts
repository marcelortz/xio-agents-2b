import { BinanceMockClient } from './binance-client';
import { RevolutMockClient } from './revolut-client';
import { StripeMockClient } from './stripe-client';
import { WiseMockClient } from './wise-client';
import { FinancialProviderClient, FinancialProviderConfig } from './types';

export type ProviderName = 'stripe' | 'revolut' | 'wise' | 'binance';

export function createPaymentProvider(
  provider: ProviderName,
  config: FinancialProviderConfig = { mode: 'mock' },
): FinancialProviderClient {
  switch (provider) {
    case 'stripe':
      return new StripeMockClient(config);
    case 'revolut':
      return new RevolutMockClient(config);
    case 'wise':
      return new WiseMockClient(config);
    case 'binance':
      return new BinanceMockClient(config);
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown payment provider "${exhaustive}"`);
    }
  }
}

export * from './types';
export { StripeMockClient } from './stripe-client';
export { RevolutMockClient } from './revolut-client';
export { WiseMockClient, WiseQuote } from './wise-client';
export { BinanceMockClient } from './binance-client';
