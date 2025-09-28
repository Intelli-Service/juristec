import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false, // Desabilitado para testes E2E sequenciais

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1, // Um worker para testes E2E consistentes

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when test fails */
    video: 'retain-on-failure',

    /* Timeout for each action */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Timeout for each test */
  timeout: 60000, // 60 segundos para testes E2E

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-e2e',
      use: {
        ...devices['Desktop Chrome'],
        /* Context options for tests */
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
        // Forçar uso do Chromium padrão ao invés do headless shell
        channel: undefined,
      },
    },

    // Desabilitados temporariamente para foco em testes funcionais
    // {
    //   name: 'firefox-e2e',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit-e2e',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    {
      name: 'mobile-chrome-e2e',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
        channel: undefined,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:8080',
  //   reuseExistingServer: !process.env.CI,
  // },

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),

  /* Test output directory */
  outputDir: 'test-results/',

  /* Whether to skip the HTML report */
  // quiet: false,
});