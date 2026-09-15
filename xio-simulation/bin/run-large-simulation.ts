import { Simulation } from '../src/xio-simulation';

const ALL_ROLES = [
  'legal',
  'sales',
  'marketing',
  'engineering',
  'support',
  'finance',
  'product',
  'research',
  'hr',
  'operations',
  'design',
  'data',
  'security',
  'compliance',
  'logistics',
  'customer-success',
  'procurement',
];

function main(): void {
  const cycles = Number(process.argv[2] ?? 30);
  const agentsPerRole = Number(process.argv[3] ?? 6);
  const maxPopulation = Number(process.argv[4] ?? 300);

  const initialPopulation = ALL_ROLES.length * agentsPerRole;
  console.log(
    `Bootstrapping ${initialPopulation} agents across ${ALL_ROLES.length} roles ` +
      `(${agentsPerRole} per role), cap=${maxPopulation}, cycles=${cycles}\n`,
  );

  const sim = new Simulation({
    roles: ALL_ROLES,
    agentsPerRole,
    cycles,
    maxPopulation,
  });

  const start = process.hrtime.bigint();
  sim.bootstrap();
  const reports = sim.run();
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

  for (const r of reports) {
    console.log(
      `cycle ${r.cycle}: alive=${r.aliveCount} dead=${r.deadCount} balance=${r.totalBalance.toFixed(2)} births=${r.births} kills=${r.kills}`,
    );
  }

  const audit = sim.exportAudit();
  const aliveByRole = new Map<string, number>();
  for (const a of audit.finalPopulation) {
    if (a.alive) aliveByRole.set(a.role, (aliveByRole.get(a.role) ?? 0) + 1);
  }

  console.log(`\nledger integrity verified: ${audit.verified}`);
  console.log(`ledger entries: ${audit.ledger.length}`);
  console.log(
    `final population: ${audit.finalPopulation.length} agents ` +
      `(${audit.finalPopulation.filter((a) => a.alive).length} alive)`,
  );
  console.log('alive by role:', Object.fromEntries(aliveByRole));
  console.log(`elapsed: ${elapsedMs.toFixed(1)}ms for ${cycles} cycles`);
}

main();
