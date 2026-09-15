/**
 * Shared contract for external payment/exchange provider clients.
 *
 * Every client in this directory is a MOCK: fully in-memory, makes no real
 * network calls, and can never move real money or place a real trade. This
 * lets the rest of the system (transaction-service, reconciliation, etc.)
 * be built and tested against a stable interface today. Swapping a mock for
 * a real client later means implementing this same interface against the
 * provider's actual (sandbox, then live) SDK — no other code should need to
 * change.
 */

export type ProviderTransactionType = 'payment' | 'transfer' | 'trade';
export type ProviderTransactionStatus = 'pending' | 'completed' | 'failed';

export interface CreateTransactionInput {
  /** Amount in `asset` (a fiat currency code like "USD", or a crypto asset like "BTC"). */
  amount: number;
  asset: string;
  /** Caller-supplied idempotency/reference key. */
  reference: string;
  description?: string;
  counterparty?: string;
}

export interface ProviderTransaction {
  id: string;
  provider: string;
  type: ProviderTransactionType;
  status: ProviderTransactionStatus;
  amount: number;
  asset: string;
  reference: string;
  description?: string;
  counterparty?: string;
  createdAt: string;
}

export interface ProviderBalance {
  asset: string;
  available: number;
}

export interface FinancialProviderConfig {
  /** Only 'mock' is implemented. 'sandbox' and 'live' are reserved for a future real integration. */
  mode: 'mock';
  /** Starting balances seeded into the in-memory account, keyed by asset. */
  initialBalances?: Record<string, number>;
}

export interface FinancialProviderClient {
  readonly name: string;
  readonly mode: 'mock';
  createTransaction(input: CreateTransactionInput): Promise<ProviderTransaction>;
  getTransaction(id: string): Promise<ProviderTransaction | null>;
  listTransactions(): Promise<ProviderTransaction[]>;
  getBalance(asset: string): Promise<ProviderBalance>;
}
