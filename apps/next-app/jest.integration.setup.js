// Integration test setup
// Sets up real test environment with actual services

// Environment variables for integration tests
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-for-integration'
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/juristec_integration_test'

// Extend timeout for integration tests
jest.setTimeout(30000)

// Setup and teardown hooks
beforeAll(async () => {
  console.log('🧪 Setting up integration test environment...')
  // Add any global setup here
})

afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...')
  // Add any global cleanup here
})