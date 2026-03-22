// __tests__/api/care/sos/sos-escalate.test.ts
// Sicherheitskritisch: SOS-Eskalation — wenn Bewohner nicht reagiert

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'helper-1' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn((table: string) => {
      if (table === 'care_sos_alerts') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'sos-1', senior_id: 'senior-1', status: 'triggered', current_escalation_level: 1, escalated_at: [], category: 'medical_emergency' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'sos-1', current_escalation_level: 2, status: 'escalated' },
                error: null,
              }),
            }),
          }),
        }),
      }
      if (table === 'care_helpers') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              contains: vi.fn().mockResolvedValue({ data: [{ user_id: 'helper-2' }], error: null }),
            }),
          }),
        }),
      }
      return { select: vi.fn() }
    }),
  }),
}))

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/notifications', () => ({ sendCareNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/care/api-helpers', () => ({ requireCareAccess: vi.fn().mockResolvedValue('helper') }))

describe('POST /api/care/sos/[id]/escalate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('eskaliert auf naechste Stufe', async () => {
    const { POST } = await import('@/app/api/care/sos/[id]/escalate/route')
    const req = new NextRequest('http://localhost/api/care/sos/sos-1/escalate', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'sos-1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.current_escalation_level).toBe(2)
    expect(data.status).toBe('escalated')
  })
})
