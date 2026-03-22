// __tests__/lib/care/channels/push.test.ts
// Sicherheitskritisch: Push-Benachrichtigungen bei SOS/Eskalation

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase — Chain: from().select().eq() → Promise
const mockEqResult = vi.fn()
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => mockEqResult()),
    })),
  })),
}

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { sendPush } from '@/lib/care/channels/push'

describe('sendPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEqResult.mockResolvedValue({ data: [{ endpoint: 'https://push.example.com/sub1', p256dh: 'key', auth: 'auth' }], error: null })
    mockFetch.mockResolvedValue({ ok: true })
  })

  it('sendet Push an Supabase-Subscriptions', async () => {
    const result = await sendPush(mockSupabase as never, {
      userId: 'user-1',
      title: 'SOS-Alert',
      body: 'Hilfe benoetigt',
    })
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalled()
  })

  it('gibt false zurueck wenn keine Subscriptions vorhanden', async () => {
    mockEqResult.mockResolvedValue({ data: [], error: null })
    const result = await sendPush(mockSupabase as never, {
      userId: 'user-no-push',
      title: 'Test',
      body: 'Test',
    })
    expect(result).toBe(false)
  })

  it('gibt false zurueck bei DB-Fehler', async () => {
    mockEqResult.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const result = await sendPush(mockSupabase as never, {
      userId: 'user-1',
      title: 'Test',
      body: 'Test',
    })
    expect(result).toBe(false)
  })
})
