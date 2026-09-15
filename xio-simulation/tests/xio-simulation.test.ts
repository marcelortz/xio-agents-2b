import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../src/xio-simulation';

test('bootstrap creates agentsPerRole agents for each configured role', () => {
  const sim = new Simulation({ roles: ['legal', 'sales'], agentsPerRole: 3, cycles: 0 });
  sim.bootstrap();
  const audit = sim.exportAudit();
  assert.equal(audit.finalPopulation.length, 6);
  assert.equal(audit.finalPopulation.filter((a) => a.role === 'legal').length, 3);
  assert.equal(audit.finalPopulation.filter((a) => a.role === 'sales').length, 3);
});

test('run produces one report per cycle', () => {
  const sim = new Simulation({ roles: ['sales'], agentsPerRole: 4, cycles: 5, maxPopulation: 40 });
  const reports = sim.run();
  assert.equal(reports.length, 5);
  assert.deepEqual(reports.map((r) => r.cycle), [1, 2, 3, 4, 5]);
});

test('exportAudit reports a verified, tamper-free ledger', () => {
  const sim = new Simulation({ roles: ['legal', 'sales'], agentsPerRole: 3, cycles: 10, maxPopulation: 60 });
  sim.run();
  const audit = sim.exportAudit();
  assert.equal(audit.verified, true);
  assert.ok(audit.ledger.length > 0);
});

test('bootstrap supports all seventeen registered roles', () => {
  const roles = [
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
  const sim = new Simulation({ roles, agentsPerRole: 2, cycles: 0 });
  sim.bootstrap();
  const audit = sim.exportAudit();
  assert.equal(audit.finalPopulation.length, 34);
  for (const role of roles) {
    assert.equal(audit.finalPopulation.filter((a) => a.role === role).length, 2);
  }
});

test('throws when bootstrapping a role with no registered agent implementation', () => {
  const sim = new Simulation({ roles: ['growth'], agentsPerRole: 1, cycles: 1 });
  assert.throws(() => sim.bootstrap(), /no agent implementation registered for role "growth"/);
});
