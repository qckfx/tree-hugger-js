/** @type {import('jest').Config} */
// Alternative Jest configuration for CI environments with tree-sitter race condition workaround
// Use this config if standard configuration still fails: npm test -- --config=jest.config.ci.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Workaround for tree-sitter race condition - map to a stable module loader
    '^tree-sitter$': '<rootDir>/tests/helpers/tree-sitter-stable.js'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  clearMocks: true,
  testTimeout: 15000, // Increased timeout for CI environments
  // Force serial execution to prevent race conditions
  maxWorkers: 1,
  // Disable test caching to prevent stale module issues
  cache: false,
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  // Additional options for stability in CI
  detectOpenHandles: true,
  forceExit: true
};