module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testTimeout: 30000,
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'E-Commerce N-Genius Payment Integration QA Test Report',
        outputPath: './reports/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ]
  ],
  projects: [
    {
      displayName: 'smoke',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/smoke.test.ts'],
    },
    {
      displayName: 'payment',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/payment.test.ts'],
    },
    {
      displayName: 'webhook',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/webhook.test.ts'],
    },
    {
      displayName: 'inventory',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/inventory.test.ts'],
    },
    {
      displayName: 'security',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/security.test.ts'],
    },
  ],
};
