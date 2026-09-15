import { Arena, CycleReport } from './xio-arena';
import {
  AgentBase,
  AgentFactory,
  AgentRole,
  ComplianceAgent,
  CustomerSuccessAgent,
  DataAgent,
  DesignAgent,
  EngineeringAgent,
  FinanceAgent,
  HRAgent,
  LegalAgent,
  LogisticsAgent,
  MarketingAgent,
  OperationsAgent,
  ProcurementAgent,
  ProductAgent,
  ResearchAgent,
  SalesAgent,
  SecurityAgent,
  SupportAgent,
} from './xio-agent.base';
import { Genome } from './xio-genome';
import { GovernanceEngine } from './xio-governance';
import { Ledger, LedgerEntry } from './xio-ledger';
import { CostModel, Metabolism } from './xio-metabolism';

export interface SimulationConfig {
  roles: AgentRole[];
  agentsPerRole: number;
  cycles: number;
  startingBalance?: number;
  costModel?: CostModel;
  reproductionThreshold?: number;
  maxPopulation?: number;
}

export interface AuditExport {
  verified: boolean;
  ledger: LedgerEntry[];
  reports: CycleReport[];
  finalPopulation: { id: string; role: string; alive: boolean; balance: number; generation: number }[];
}

const AGENT_CONSTRUCTORS: Record<string, new (...args: ConstructorParameters<typeof LegalAgent>) => AgentBase> = {
  legal: LegalAgent,
  sales: SalesAgent,
  marketing: MarketingAgent,
  engineering: EngineeringAgent,
  support: SupportAgent,
  finance: FinanceAgent,
  product: ProductAgent,
  research: ResearchAgent,
  hr: HRAgent,
  operations: OperationsAgent,
  design: DesignAgent,
  data: DataAgent,
  security: SecurityAgent,
  compliance: ComplianceAgent,
  logistics: LogisticsAgent,
  'customer-success': CustomerSuccessAgent,
  procurement: ProcurementAgent,
};

export class Simulation {
  private readonly ledger = new Ledger();
  private readonly metabolism: Metabolism;
  private readonly governance: GovernanceEngine;
  private arena!: Arena;
  private nextId = 0;

  constructor(private readonly config: SimulationConfig) {
    this.metabolism = new Metabolism(this.ledger, config.costModel);
    this.governance = new GovernanceEngine(this.ledger);
  }

  bootstrap(): void {
    const factory: AgentFactory = (role, id, genome) => this.createAgent(role, id, genome);
    const agents: AgentBase[] = [];
    for (const role of this.config.roles) {
      for (let i = 0; i < this.config.agentsPerRole; i++) {
        const genome = Genome.random().specializeFor(role);
        agents.push(factory(role, this.generateId(role), genome));
      }
    }
    this.arena = new Arena(
      agents,
      this.ledger,
      this.metabolism,
      this.governance,
      factory,
      this.config.reproductionThreshold ?? 150,
      this.config.maxPopulation ?? agents.length * 10,
    );
  }

  run(): CycleReport[] {
    if (!this.arena) this.bootstrap();
    return this.arena.run(this.config.cycles);
  }

  exportAudit(): AuditExport {
    const finalPopulation = this.arena.getAgents().map((a) => ({
      id: a.id,
      role: a.role,
      alive: a.alive,
      balance: a.balance,
      generation: a.genome.generation,
    }));
    return {
      verified: this.ledger.verifyIntegrity(),
      ledger: this.ledger.getHistory(),
      reports: this.arena.getReports(),
      finalPopulation,
    };
  }

  private createAgent(role: AgentRole, id: string, genome: Genome): AgentBase {
    const Ctor = AGENT_CONSTRUCTORS[role];
    if (!Ctor) throw new Error(`no agent implementation registered for role "${role}"`);
    return new Ctor(id, genome, this.ledger, this.metabolism, this.config.startingBalance ?? 100);
  }

  private generateId(role: AgentRole): string {
    return `${role}-${this.nextId++}`;
  }
}
