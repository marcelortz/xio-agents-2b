export interface Traits {
  efficiency: number;
  riskTolerance: number;
  creativity: number;
  resilience: number;
  speed: number;
}

const TRAIT_KEYS: (keyof Traits)[] = [
  'efficiency',
  'riskTolerance',
  'creativity',
  'resilience',
  'speed',
];

const ROLE_TRAIT_BIAS: Record<string, Partial<Traits>> = {
  legal: { resilience: 0.2, riskTolerance: -0.15 },
  sales: { creativity: 0.2, speed: 0.15 },
  marketing: { creativity: 0.25, speed: 0.1, riskTolerance: 0.1 },
  engineering: { efficiency: 0.25, resilience: 0.15, riskTolerance: -0.1 },
  support: { resilience: 0.2, efficiency: 0.15, riskTolerance: -0.1 },
  finance: { efficiency: 0.2, riskTolerance: -0.2 },
  product: { creativity: 0.15, efficiency: 0.15, riskTolerance: 0.05 },
  research: { creativity: 0.2, riskTolerance: 0.15 },
  hr: { resilience: 0.15, speed: 0.1 },
  operations: { efficiency: 0.2, resilience: 0.1 },
  design: { creativity: 0.2, speed: 0.1 },
  data: { efficiency: 0.15, creativity: 0.15 },
  security: { resilience: 0.25, riskTolerance: -0.15 },
  compliance: { resilience: 0.15, efficiency: 0.1, riskTolerance: -0.15 },
  logistics: { efficiency: 0.15, speed: 0.15 },
  'customer-success': { resilience: 0.15, speed: 0.1 },
  procurement: { efficiency: 0.15, riskTolerance: -0.1 },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mapTraits(traits: Traits, fn: (value: number, key: keyof Traits) => number): Traits {
  const result = {} as Traits;
  for (const key of TRAIT_KEYS) result[key] = fn(traits[key], key);
  return result;
}

export class Genome {
  constructor(
    public readonly traits: Traits,
    public readonly generation: number = 0,
    public readonly lineage: string[] = [],
  ) {}

  static random(generation = 0): Genome {
    const traits = {} as Traits;
    for (const key of TRAIT_KEYS) traits[key] = Math.random();
    return new Genome(traits, generation);
  }

  specializeFor(role: string): Genome {
    const bias = ROLE_TRAIT_BIAS[role];
    if (!bias) return this;
    const traits = mapTraits(this.traits, (value, key) => clamp01(value + (bias[key] ?? 0)));
    return new Genome(traits, this.generation, this.lineage);
  }

  mutate(rate = 0.05): Genome {
    const traits = mapTraits(this.traits, (value) => clamp01(value + (Math.random() * 2 - 1) * rate));
    return new Genome(traits, this.generation, this.lineage);
  }

  static crossover(parentA: Genome, parentB: Genome, mutationRate = 0.05): Genome {
    const traits = {} as Traits;
    for (const key of TRAIT_KEYS) {
      traits[key] = Math.random() < 0.5 ? parentA.traits[key] : parentB.traits[key];
    }
    const generation = Math.max(parentA.generation, parentB.generation) + 1;
    const lineage = [...parentA.lineage, ...parentB.lineage].slice(-10);
    return new Genome(traits, generation, lineage).mutate(mutationRate);
  }

  fitness(): number {
    return TRAIT_KEYS.reduce((sum, key) => sum + this.traits[key], 0) / TRAIT_KEYS.length;
  }

  toJSON(): Record<string, unknown> {
    return { traits: this.traits, generation: this.generation, lineage: this.lineage };
  }
}

export { TRAIT_KEYS };
