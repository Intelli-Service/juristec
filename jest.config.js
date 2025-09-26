/** @type {import('jest').Config} */
module.exports = {
  // Monorepo configuration for Jest
  projects: [
    // Backend NestJS project
    {
      displayName: 'Backend (NestJS)',
      rootDir: './apps/websocket-service-nest',
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
      testRegex: '.*\\.spec\\.ts$',
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!uuid/)'
      ],
      collectCoverageFrom: [
        '**/*.(t|j)s',
        '!**/*.spec.ts',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**',
      ],
      coverageDirectory: '../../coverage/backend',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageThreshold: {
        global: {
          statements: 40, // Progressive increase: 40% -> 60% -> 80%
          branches: 35,
          functions: 40,
          lines: 40,
        },
      },
      setupFiles: ['<rootDir>/test/setup.ts'],
    },
    
    // Frontend Next.js project
    {
      displayName: 'Frontend (Next.js)',
      rootDir: './apps/next-app',
      testEnvironment: 'jsdom',
      moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
        '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
      ],
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/test/**',
      ],
      coverageDirectory: '../../coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageThreshold: {
        global: {
          statements: 50, // Progressive increase: 50% -> 65% -> 80%
          branches: 45,
          functions: 50,
          lines: 50,
        },
      },
    },
  ],
  
  // Global configuration
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  
  // Global coverage thresholds (combined projects)
  coverageThreshold: {
    global: {
      statements: 45,
      branches: 40,
      functions: 45,
      lines: 45,
    },
  },
  
  // Test timeout for longer-running tests
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Fail fast on first test failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Notify on test completion
  notify: false,
  
  // Run tests in parallel for speed
  maxWorkers: process.env.CI ? 2 : '50%',
};