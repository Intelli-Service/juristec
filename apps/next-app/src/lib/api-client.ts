import { getSession } from 'next-auth/react'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const session = await getSession()
  
  if (!session?.user) {
    throw new Error('Not authenticated')
  }

  // In development with proxy, API calls go to /api/* which gets routed to backend
  // In production, this would be handled by the same proxy/load balancer
  const baseUrl = process.env.NODE_ENV === 'development' ? '' : (process.env.NEXT_PUBLIC_API_URL || '')
  const url = `${baseUrl}/api${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Cookies (including NextAuth session) are automatically sent by the browser
  // No need to manually handle JWT tokens
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include', // Include cookies in the request
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API call failed: ${response.status} ${error}`)
  }

  return response.json()
}

export async function apiGet(endpoint: string) {
  return apiCall(endpoint, { method: 'GET' })
}

export async function apiPost(endpoint: string, body: unknown) {
  return apiCall(endpoint, { method: 'POST', body })
}

export async function apiPut(endpoint: string, body: unknown) {
  return apiCall(endpoint, { method: 'PUT', body })
}

export async function apiDelete(endpoint: string) {
  return apiCall(endpoint, { method: 'DELETE' })
}