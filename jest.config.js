module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.demo.ts'
  ],
  // These reflect the repo's actual current coverage (see PR discussion),
  // not an aspirational target - they exist to catch regressions below the
  // present baseline, not to claim the codebase is well-tested. Raise them
  // as real coverage improves; do not lower them to make a failing PR pass.
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 40,
      lines: 40,
      statements: 40
    }
  }
};
