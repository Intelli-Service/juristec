const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{js,ts}'],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testTimeout: 30000, // 30 seconds for integration tests
  // Different from unit tests - test against real services
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
}

module.exports = createJestConfig(customJestConfig)