import { Genome } from './xio-genome';
import { Ledger } from './xio-ledger';
import { Metabolism } from './xio-metabolism';

export type AgentRole =
  | 'legal'
  | 'sales'
  | 'marketing'
  | 'engineering'
  | 'support'
  | 'finance'
  | 'product'
  | 'research'
  | 'hr'
  | 'operations'
  | 'design'
  | 'data'
  | 'security'
  | 'compliance'
  | 'logistics'
  | 'customer-success'
  | 'procurement'
  | string;

export interface ActionResult {
  actions: number;
  revenue: number;
}

export abstract class AgentBase {
  public alive = true;
  public age = 0;
  public balance: number;

  constructor(
    public readonly id: string,
    public readonly role: AgentRole,
    public readonly genome: Genome,
    protected readonly ledger: Ledger,
    protected readonly metabolism: Metabolism,
    startingBalance = 100,
  ) {
    this.balance = startingBalance;
  }

  abstract act(): ActionResult;

  tick(): void {
    if (!this.alive) return;
    this.age++;
    const { actions, revenue } = this.act();
    const cost = this.metabolism.chargeCycleCost(this.id, actions);
    this.metabolism.recordGain(this.id, revenue, `${this.role}-action`);
    this.balance += revenue - cost;
  }

  canReproduce(threshold = 150): boolean {
    return this.alive && this.balance >= threshold;
  }

  reproduceWith(partner: AgentBase): Genome {
    this.balance -= 50;
    partner.balance -= 50;
    return Genome.crossover(this.genome, partner.genome);
  }

  die(reason: string): void {
    if (!this.alive) return;
    this.alive = false;
    this.ledger.append({
      agentId: this.id,
      type: 'death',
      amount: Math.max(0, this.balance),
      metadata: { reason, age: this.age },
    });
  }
}

export class LegalAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'legal', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, riskTolerance, resilience } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 3);
    const feePerCase = 20 + riskTolerance * 10 + resilience * 5;
    return { actions, revenue: actions * feePerCase };
  }
}

export class SalesAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'sales', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { creativity, speed, riskTolerance } = this.genome.traits;
    const actions = Math.round(2 + speed * 4);
    const closeRate = 0.3 + creativity * 0.4 + riskTolerance * 0.2;
    const dealSize = 15 + creativity * 20;
    return { actions, revenue: actions * closeRate * dealSize };
  }
}

export class MarketingAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'marketing', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { creativity, speed, riskTolerance } = this.genome.traits;
    const actions = Math.round(2 + speed * 3);
    const reachPerCampaign = 50 + creativity * 100;
    const conversionRate = 0.05 + riskTolerance * 0.05;
    return { actions, revenue: actions * reachPerCampaign * conversionRate };
  }
}

export class EngineeringAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'engineering', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, resilience, creativity } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerFeature = 30 + resilience * 20 + creativity * 10;
    return { actions, revenue: actions * valuePerFeature };
  }
}

export class SupportAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'support', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { resilience, efficiency, riskTolerance } = this.genome.traits;
    const actions = Math.round(3 + resilience * 4);
    const valuePerTicket = 10 + efficiency * 15 - riskTolerance * 5;
    return { actions, revenue: actions * valuePerTicket };
  }
}

export class FinanceAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'finance', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, riskTolerance } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerDeal = 40 + efficiency * 30 - riskTolerance * 15;
    return { actions, revenue: actions * valuePerDeal };
  }
}

export class ProductAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'product', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { creativity, efficiency, riskTolerance } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerFeature = 35 + creativity * 25 + riskTolerance * 10;
    return { actions, revenue: actions * valuePerFeature };
  }
}

export class ResearchAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'research', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { creativity, riskTolerance, efficiency } = this.genome.traits;
    const actions = Math.round(1 + creativity * 2);
    const valuePerExperiment = 20 + riskTolerance * 40 + efficiency * 10;
    return { actions, revenue: actions * valuePerExperiment };
  }
}

export class HRAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'hr', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { resilience, speed, efficiency } = this.genome.traits;
    const actions = Math.round(1 + speed * 2);
    const valuePerHire = 25 + resilience * 20 + efficiency * 10;
    return { actions, revenue: actions * valuePerHire };
  }
}

export class OperationsAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'operations', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, resilience } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 3);
    const valuePerProcess = 15 + efficiency * 15 + resilience * 10;
    return { actions, revenue: actions * valuePerProcess };
  }
}

export class DesignAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'design', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { creativity, speed } = this.genome.traits;
    const actions = Math.round(1 + speed * 2);
    const valuePerDesign = 25 + creativity * 30;
    return { actions, revenue: actions * valuePerDesign };
  }
}

export class DataAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'data', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, creativity } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerInsight = 20 + efficiency * 20 + creativity * 15;
    return { actions, revenue: actions * valuePerInsight };
  }
}

export class SecurityAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'security', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { resilience, riskTolerance } = this.genome.traits;
    const actions = Math.round(1 + resilience * 2);
    const valuePerAudit = 30 + resilience * 25 - riskTolerance * 10;
    return { actions, revenue: actions * valuePerAudit };
  }
}

export class ComplianceAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'compliance', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { resilience, efficiency, riskTolerance } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerCheck = 20 + resilience * 20 - riskTolerance * 10;
    return { actions, revenue: actions * valuePerCheck };
  }
}

export class LogisticsAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'logistics', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, speed } = this.genome.traits;
    const actions = Math.round(1 + speed * 3);
    const valuePerShipment = 15 + efficiency * 20;
    return { actions, revenue: actions * valuePerShipment };
  }
}

export class CustomerSuccessAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'customer-success', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { resilience, speed } = this.genome.traits;
    const actions = Math.round(2 + speed * 3);
    const valuePerAccount = 20 + resilience * 15;
    return { actions, revenue: actions * valuePerAccount };
  }
}

export class ProcurementAgent extends AgentBase {
  constructor(id: string, genome: Genome, ledger: Ledger, metabolism: Metabolism, startingBalance = 100) {
    super(id, 'procurement', genome, ledger, metabolism, startingBalance);
  }

  act(): ActionResult {
    const { efficiency, riskTolerance } = this.genome.traits;
    const actions = Math.round(1 + efficiency * 2);
    const valuePerContract = 30 + efficiency * 20 - riskTolerance * 10;
    return { actions, revenue: actions * valuePerContract };
  }
}

export type AgentFactory = (role: AgentRole, id: string, genome: Genome) => AgentBase;
