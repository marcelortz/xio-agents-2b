import { MockProviderClient } from './mock-base-client';
import { FinancialProviderConfig } from './types';

/**
 * Mock Binance client — simulates crypto balances and order placement.
 *
 * This is a MOCK ONLY. It never places a real order, never connects to
 * Binance, and never touches real funds. `createTransaction` here
 * represents a simulated order fill for scaffolding/testing purposes.
 *
 * To go live: use Binance's real testnet (testnet.binance.vision) with
 * testnet API keys before ever considering the production trading API —
 * and note that automated real trading requires explicit, separate
 * authorization beyond what this codebase provides.
 */
export class BinanceMockClient extends MockProviderClient {
  constructor(config: FinancialProviderConfig = { mode: 'mock' }) {
    super('Binance', 'trade', config.initialBalances ?? { BTC: 0, ETH: 0, USDT: 0 });
  }
}
