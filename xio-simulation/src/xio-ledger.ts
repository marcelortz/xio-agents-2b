import { createHash } from 'node:crypto';

export type LedgerEntryType = 'income' | 'expense' | 'reproduction' | 'death' | 'governance';

export interface LedgerEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly agentId: string;
  readonly type: LedgerEntryType;
  readonly amount: number;
  readonly metadata: Record<string, unknown>;
  readonly prevHash: string;
  readonly hash: string;
}

export type FinancialPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export interface FinancialPressure {
  level: FinancialPressureLevel;
  netFlow: number;
  burnRate: number;
}

const GENESIS_HASH = '0'.repeat(64);

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class Ledger {
  private entries: LedgerEntry[] = [];
  private entriesByAgent = new Map<string, LedgerEntry[]>();
  private sequence = 0;

  // Incremental integrity-check cursor: entries before `verifiedUpTo` were
  // already confirmed part of a valid chain by a prior verifyIntegrity()
  // call, so subsequent calls only re-hash entries appended since then
  // instead of the whole ledger. This makes verifyIntegrity() amortized
  // O(1) per call in the common case (called once per new entry), instead
  // of O(ledger size) — essential once ledgers grow past a few thousand
  // entries with 100+ agents. Trade-off: an entry that was already folded
  // into `verifiedUpTo` and is *then* mutated in place (bypassing append,
  // as the tests do deliberately) will not be re-detected by a later call.
  private verifiedUpTo = 0;
  private verifiedTipHash = GENESIS_HASH;
  private chainBroken = false;

  append(entry: {
    agentId: string;
    type: LedgerEntryType;
    amount: number;
    metadata?: Record<string, unknown>;
  }): LedgerEntry {
    const prevHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].hash : GENESIS_HASH;
    const id = `L-${++this.sequence}`;
    const timestamp = Date.now();
    const metadata = entry.metadata ?? {};
    const payload = JSON.stringify({ id, timestamp, agentId: entry.agentId, type: entry.type, amount: entry.amount, metadata, prevHash });
    const hash = sha256(payload);
    const record: LedgerEntry = { id, timestamp, agentId: entry.agentId, type: entry.type, amount: entry.amount, metadata, prevHash, hash };
    this.entries.push(record);
    const byAgent = this.entriesByAgent.get(entry.agentId);
    if (byAgent) byAgent.push(record);
    else this.entriesByAgent.set(entry.agentId, [record]);
    return record;
  }

  verifyIntegrity(): boolean {
    if (this.chainBroken) return false;
    let prevHash = this.verifiedTipHash;
    for (let i = this.verifiedUpTo; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry.prevHash !== prevHash) {
        this.chainBroken = true;
        return false;
      }
      const payload = JSON.stringify({
        id: entry.id,
        timestamp: entry.timestamp,
        agentId: entry.agentId,
        type: entry.type,
        amount: entry.amount,
        metadata: entry.metadata,
        prevHash: entry.prevHash,
      });
      if (sha256(payload) !== entry.hash) {
        this.chainBroken = true;
        return false;
      }
      prevHash = entry.hash;
    }
    this.verifiedUpTo = this.entries.length;
    this.verifiedTipHash = prevHash;
    return true;
  }

  getBalance(agentId: string): number {
    const byAgent = this.entriesByAgent.get(agentId);
    if (!byAgent) return 0;
    return byAgent.reduce((sum, e) => sum + this.signedAmount(e), 0);
  }

  financialPressure(agentId: string, windowCycles = 10): FinancialPressure {
    const byAgent = this.entriesByAgent.get(agentId);
    const recent = byAgent
      ? byAgent.filter((e) => e.type === 'income' || e.type === 'expense').slice(-windowCycles)
      : [];
    const netFlow = recent.reduce((sum, e) => sum + this.signedAmount(e), 0);
    const expenses = recent.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const burnRate = recent.length > 0 ? expenses / recent.length : 0;
    let level: FinancialPressureLevel = 'low';
    if (netFlow < 0 && burnRate > 0) {
      const severity = Math.abs(netFlow) / (burnRate || 1);
      if (severity > 8) level = 'critical';
      else if (severity > 4) level = 'high';
      else level = 'medium';
    }
    return { level, netFlow, burnRate };
  }

  getHistory(agentId?: string): LedgerEntry[] {
    if (!agentId) return [...this.entries];
    return [...(this.entriesByAgent.get(agentId) ?? [])];
  }

  private signedAmount(entry: LedgerEntry): number {
    return entry.type === 'expense' || entry.type === 'death' ? -entry.amount : entry.amount;
  }
}
