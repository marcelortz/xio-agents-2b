import { randomUUID } from 'crypto';
import {
  CreateTransactionInput,
  FinancialProviderClient,
  ProviderBalance,
  ProviderTransaction,
  ProviderTransactionType,
} from './types';

/**
 * Shared in-memory implementation used by every mock provider client.
 * Each instance holds its own isolated state — no data is shared across
 * clients or persisted anywhere, and no network call is ever made.
 */
export abstract class MockProviderClient implements FinancialProviderClient {
  readonly mode = 'mock' as const;
  protected readonly balances = new Map<string, number>();
  protected readonly transactions = new Map<string, ProviderTransaction>();

  constructor(
    public readonly name: string,
    private readonly transactionType: ProviderTransactionType,
    initialBalances: Record<string, number> = {},
  ) {
    for (const [asset, amount] of Object.entries(initialBalances)) {
      this.balances.set(asset, amount);
    }
  }

  async createTransaction(input: CreateTransactionInput): Promise<ProviderTransaction> {
    const available = this.balances.get(input.asset) ?? 0;
    const status = input.amount <= available ? 'completed' : 'failed';

    if (status === 'completed') {
      this.balances.set(input.asset, available - input.amount);
    }

    const transaction: ProviderTransaction = {
      id: `${this.name.toLowerCase()}-${randomUUID()}`,
      provider: this.name,
      type: this.transactionType,
      status,
      amount: input.amount,
      asset: input.asset,
      reference: input.reference,
      description: input.description,
      counterparty: input.counterparty,
      createdAt: new Date().toISOString(),
    };

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async getTransaction(id: string): Promise<ProviderTransaction | null> {
    return this.transactions.get(id) ?? null;
  }

  async listTransactions(): Promise<ProviderTransaction[]> {
    return [...this.transactions.values()];
  }

  async getBalance(asset: string): Promise<ProviderBalance> {
    return { asset, available: this.balances.get(asset) ?? 0 };
  }
}
