/**
 * Testes de autenticação - NextAuth.js
 * Testa fluxos básicos de login e logout
 */

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock fetch para simular respostas NextAuth
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      // 1. Mock CSRF token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' })
      })

      // 2. Mock successful login callback
      mockFetch.mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          'Location': '/admin',
          'Set-Cookie': 'next-auth.session-token=valid-session'
        })
      })

      // 3. Mock session response with user data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@demo.com',
            name: 'Admin User',
            role: 'super_admin',
            permissions: ['manage_ai_config', 'manage_users']
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })

      // Executar fluxo de login
      const csrfResponse = await fetch('/api/auth/csrf')
      expect(csrfResponse.ok).toBe(true)

      const loginResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=admin@demo.com&password=admin123&callbackUrl=/admin&csrfToken=test-csrf-token'
      })

      expect(loginResponse.status).toBe(302)
      expect(loginResponse.headers.get('Location')).toBe('/admin')

      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()
      
      expect(session.user).toBeDefined()
      expect(session.user.email).toBe('admin@demo.com')
      expect(session.user.role).toBe('super_admin')
    })

    it('should reject login with invalid credentials', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      // Mock CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' })
      })

      // Mock failed login - redirect back to signin
      mockFetch.mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          'Location': '/auth/signin?error=CredentialsSignin'
        })
      })

      // Mock empty session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const csrfResponse = await fetch('/api/auth/csrf')
      expect(csrfResponse.ok).toBe(true)

      const loginResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=admin@demo.com&password=wrong-password&callbackUrl=/admin&csrfToken=test-csrf-token'
      })

      expect(loginResponse.status).toBe(302)
      expect(loginResponse.headers.get('Location')).toContain('/auth/signin')
      expect(loginResponse.headers.get('Location')).toContain('error=CredentialsSignin')

      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()
      
      expect(session.user).toBeUndefined()
    })

    it('should handle missing credentials', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      // Mock CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' })
      })

      // Mock failed login - missing credentials
      mockFetch.mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          'Location': '/auth/signin?error=CredentialsSignin'
        })
      })

      const csrfResponse = await fetch('/api/auth/csrf')
      expect(csrfResponse.ok).toBe(true)

      const loginResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'callbackUrl=/admin&csrfToken=test-csrf-token'
      })

      expect(loginResponse.status).toBe(302)
      expect(loginResponse.headers.get('Location')).toContain('/auth/signin')
      expect(loginResponse.headers.get('Location')).toContain('error=CredentialsSignin')
    })
  })

  describe('Session Management', () => {
    it('should return valid session for authenticated user', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: '1',
            email: 'admin@demo.com',
            name: 'Admin User',
            role: 'super_admin',
            permissions: ['manage_ai_config', 'manage_users']
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      })

      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()
      
      expect(session.user).toBeDefined()
      expect(session.user.id).toBe('1')
      expect(session.user.role).toBe('super_admin')
      expect(session.user.permissions).toContain('manage_ai_config')
    })

    it('should return empty session for unauthenticated user', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()
      
      expect(session.user).toBeUndefined()
    })
  })

  describe('Logout', () => {
    it('should successfully logout authenticated user', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      // Mock CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-csrf-token' })
      })

      // Mock logout redirect
      mockFetch.mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          'Location': '/',
          'Set-Cookie': 'next-auth.session-token=; Max-Age=0'
        })
      })

      // Mock empty session after logout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const csrfResponse = await fetch('/api/auth/csrf')
      expect(csrfResponse.ok).toBe(true)

      const logoutResponse = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'csrfToken=test-csrf-token'
      })

      expect(logoutResponse.status).toBe(302)
      expect(logoutResponse.headers.get('Location')).toBe('/')

      const sessionResponse = await fetch('/api/auth/session')
      const session = await sessionResponse.json()
      
      expect(session.user).toBeUndefined()
    })
  })
})