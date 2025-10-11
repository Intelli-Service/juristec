// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
if (typeof window !== 'undefined') {
  import('@testing-library/jest-dom')
}

// Mock fetch for Node.js environment
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ error: 'Service not available' }),
    text: () => Promise.resolve('Service not available'),
  })
)

// Mock scrollIntoView for DOM elements
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    writable: true,
    value: jest.fn(),
  });

  // Mock scrollHeight and scrollTop for DOM elements
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    writable: true,
    value: 1000,
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    writable: true,
    value: 0,
  });
}