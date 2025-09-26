// Frontend Test Setup - Next.js/React Environment
import '@testing-library/jest-dom';
import 'whatwg-fetch';

// Global test environment configuration
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next/Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Mock Socket.io client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connected: false,
  })),
}));

// Mock toast notifications (Sonner)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: ({ children }: { children?: React.ReactNode }) => children,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Send: () => <div data-testid="send-icon">Send</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Bot: () => <div data-testid="bot-icon">Bot</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  AlertTriangle: () => <div data-testid="alert-icon">Alert</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
}));

// Global test utilities for React components
global.testUtils = {
  createMockFile: (name = 'test.pdf', type = 'application/pdf', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },
  
  createMockUser: (overrides = {}) => ({
    id: 'mock-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'client',
    ...overrides,
  }),
  
  createMockSession: (overrides = {}) => ({
    user: global.testUtils.createMockUser(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }),

  mockLocalStorage: () => {
    const storage: { [key: string]: string } = {};
    return {
      getItem: jest.fn((key: string) => storage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
      }),
    };
  },
};

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: global.testUtils.mockLocalStorage(),
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: global.testUtils.mockLocalStorage(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Console suppression for cleaner test output
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export {};