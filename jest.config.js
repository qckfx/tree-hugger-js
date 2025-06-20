/** @type {import('jest').Config} */
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
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  clearMocks: true,
  testTimeout: 15000, // Increased timeout for tree-sitter operations
  // Configuration to mitigate tree-sitter race condition in CI environments
  // Based on tree-sitter/node-tree-sitter#181
  maxWorkers: process.env.CI ? 1 : '50%', // Serial in CI, parallel locally
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts']
};