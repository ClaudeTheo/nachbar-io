// __tests__/api/caregiver/chat.test.ts
// Sicherheitskritisch: Caregiver-Chat — Datentrennung pruefen

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockUser = { id: 'caregiver-1' }
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: vi.fn().mockResolvedValue({ supabase: mockSupabase, user: mockUser }),
  requireSubscription: vi.fn().mockResolvedValue(true),
  unauthorizedResponse: vi.fn(() => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })),
}))

describe('POST /api/caregiver/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lehnt ab ohne resident_id (400)', async () => {
    const { POST } = await import('@/app/api/caregiver/chat/route')
    const req = new NextRequest('http://localhost/api/caregiver/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('lehnt ab ohne aktiven Caregiver-Link (403)', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/caregiver/chat/route')
    const req = new NextRequest('http://localhost/api/caregiver/chat', {
      method: 'POST',
      body: JSON.stringify({ resident_id: 'resident-without-link' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Verknuepfung')
  })

  it('gibt bestehende Konversation zurueck wenn vorhanden', async () => {
    // Caregiver-Link Mock
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'caregiver_links') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'link-1' }, error: null }),
              }),
            }),
          }),
        }),
      }
      if (table === 'conversations') return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'conv-existing' }, error: null }),
          }),
        }),
      }
      return { select: vi.fn() }
    })

    const { POST } = await import('@/app/api/caregiver/chat/route')
    const req = new NextRequest('http://localhost/api/caregiver/chat', {
      method: 'POST',
      body: JSON.stringify({ resident_id: 'resident-1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.conversation_id).toBe('conv-existing')
    expect(data.created).toBe(false)
  })
})
