// __tests__/api/care/sos/sos-respond.test.ts
// Sicherheitskritisch: Helfer reagiert auf SOS-Alert

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'helper-1' }
const mockAlert = { id: 'sos-1', senior_id: 'senior-1', status: 'triggered' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn((table: string) => {
      if (table === 'care_sos_alerts') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockAlert, error: null }) }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
      if (table === 'care_sos_responses') return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'resp-1', sos_alert_id: 'sos-1', helper_id: 'helper-1', response_type: 'accepted' },
              error: null,
            }),
          }),
        }),
      }
      if (table === 'care_helpers') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'h-1', assigned_seniors: ['senior-1'] }, error: null,
              }),
            }),
          }),
        }),
      }
      if (table === 'users') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
          }),
        }),
      }
      return { select: vi.fn() }
    }),
  }),
}))

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/notifications', () => ({ sendCareNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: string) => v),
  decryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS: ['note'],
}))

describe('POST /api/care/sos/[id]/respond', () => {
  beforeEach(() => vi.clearAllMocks())

  it('akzeptiert gueltige Reaktion (201)', async () => {
    const { POST } = await import('@/app/api/care/sos/[id]/respond/route')
    const req = new NextRequest('http://localhost/api/care/sos/sos-1/respond', {
      method: 'POST',
      body: JSON.stringify({ response_type: 'accepted', eta_minutes: 5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'sos-1' }) })
    expect(res.status).toBe(201)
  })

  it('lehnt ab ohne response_type (400)', async () => {
    const { POST } = await import('@/app/api/care/sos/[id]/respond/route')
    const req = new NextRequest('http://localhost/api/care/sos/sos-1/respond', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'sos-1' }) })
    expect(res.status).toBe(400)
  })

  it('lehnt ungueltigen response_type ab (400)', async () => {
    const { POST } = await import('@/app/api/care/sos/[id]/respond/route')
    const req = new NextRequest('http://localhost/api/care/sos/sos-1/respond', {
      method: 'POST',
      body: JSON.stringify({ response_type: 'maybe_later' }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'sos-1' }) })
    expect(res.status).toBe(400)
  })
})
