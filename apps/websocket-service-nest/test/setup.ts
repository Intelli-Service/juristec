// Backend Test Setup - NestJS/Node.js Environment
import 'dotenv/config';

// Global test environment configuration
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/juristec-test';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-api-key';

// Increase Jest timeout for database operations
jest.setTimeout(30000);

// Global mocks for external services
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('Mocked AI response'),
          functionCalls: jest.fn().mockReturnValue([]),
        },
      }),
    }),
  })),
}));

// Mock MongoDB connection for isolated testing
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({}),
    disconnect: jest.fn().mockResolvedValue({}),
  };
});

// Console suppression for cleaner test output (can be enabled for debugging)
if (process.env.SUPPRESS_CONSOLE !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    _id: 'mock-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    ...overrides,
  }),

  createMockConversation: (overrides = {}) => ({
    _id: 'mock-conversation-id',
    roomId: 'test-room',
    userId: 'mock-user-id',
    status: 'active',
    ...overrides,
  }),

  createMockMessage: (overrides = {}) => ({
    _id: 'mock-message-id',
    conversationId: 'mock-conversation-id',
    content: 'Test message',
    sender: 'user',
    ...overrides,
  }),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};
