// __tests__/api/care/sos/sos-create.test.ts
// Sicherheitskritisch: SOS-Alert erstellen — die kritischste API-Route

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'sos-1', status: 'triggered', category: 'medical_emergency', senior_id: 'user-1' },
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            contains: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  }),
}))

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/notifications', () => ({ sendCareNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/permissions', () => ({ canAccessFeature: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/care/api-helpers', () => ({ requireCareAccess: vi.fn().mockResolvedValue('senior') }))
vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: string) => v),
  decryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS: ['notes'],
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS: ['note'],
}))
vi.mock('@/lib/care/consent', () => ({ checkCareConsent: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/quarters/helpers', () => ({ getUserQuarterId: vi.fn().mockResolvedValue('q-bs') }))
vi.mock('@/lib/care/logger', () => ({
  createCareLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  })),
}))

describe('POST /api/care/sos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('erstellt SOS-Alert mit gueltiger Kategorie (201)', async () => {
    const { POST } = await import('@/app/api/care/sos/route')
    const req = new NextRequest('http://localhost/api/care/sos', {
      method: 'POST',
      body: JSON.stringify({ category: 'medical_emergency' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.category).toBe('medical_emergency')
  })

  it('lehnt ab ohne Kategorie (400)', async () => {
    const { POST } = await import('@/app/api/care/sos/route')
    const req = new NextRequest('http://localhost/api/care/sos', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('lehnt ungueltige Kategorie ab (400)', async () => {
    const { POST } = await import('@/app/api/care/sos/route')
    const req = new NextRequest('http://localhost/api/care/sos', {
      method: 'POST',
      body: JSON.stringify({ category: 'hacker_attack' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('lehnt ungueltige Source ab (400)', async () => {
    const { POST } = await import('@/app/api/care/sos/route')
    const req = new NextRequest('http://localhost/api/care/sos', {
      method: 'POST',
      body: JSON.stringify({ category: 'medical_emergency', source: 'invalid' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
