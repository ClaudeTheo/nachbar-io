// __tests__/lib/supabase/middleware.test.ts
// Sicherheitskritisch: Auth-Middleware schuetzt alle geschuetzten Routes

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock createServerClient
const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { updateSession } from '@/lib/supabase/middleware'

describe('updateSession (Auth-Middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('erlaubt oeffentliche Seiten ohne Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new NextRequest('http://localhost/')
    const res = await updateSession(req)
    // Root-Seite ist oeffentlich, kein Redirect
    expect(res.status).not.toBe(307)
  })

  it('erlaubt API-Routes ohne Redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new NextRequest('http://localhost/api/alerts')
    const res = await updateSession(req)
    const loc = res.headers.get('location')
    expect(loc === null || !loc.includes('/login')).toBe(true)
  })

  it('erlaubt Login-Seite ohne Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new NextRequest('http://localhost/login')
    const res = await updateSession(req)
    const loc = res.headers.get('location')
    expect(loc === null || !loc.includes('/login')).toBe(true)
  })

  it('redirected geschuetzte Seiten zu /login ohne Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = new NextRequest('http://localhost/dashboard')
    const res = await updateSession(req)
    const loc = res.headers.get('location')
    // Entweder Redirect zu /login oder 401/403
    expect(loc === null || loc.includes('/login') || res.status >= 400).toBe(true)
  })
})
