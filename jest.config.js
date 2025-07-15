module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/tests/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.ts'],
};