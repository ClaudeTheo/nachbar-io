// __tests__/api/admin/health.test.ts
// Admin Health-Check: Systemstatus-Endpunkt

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUser = { id: 'admin-1' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn((table: string) => {
      if (table === 'users') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
          }),
        }),
      }
      if (table === 'push_subscriptions' || table === 'alerts' || table === 'help_requests' || table === 'notifications') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }
      if (table === 'news_items') return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) }) }
    }),
  }),
}))

vi.mock('@/lib/care/cron-heartbeat', () => ({
  checkCronHealth: vi.fn().mockResolvedValue([
    { name: 'waste-reminder', status: 'ok', detail: 'Letzte Ausfuehrung: vor 2h' },
  ]),
}))

describe('GET /api/admin/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt Health-Status fuer Admins zurueck', async () => {
    const { GET } = await import('@/app/api/admin/health/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.overall).toBeDefined()
    expect(data.checks).toBeInstanceOf(Array)
    expect(data.timestamp).toBeDefined()
  })
})
