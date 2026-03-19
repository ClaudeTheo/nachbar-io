// __tests__/api/cron/expire-invitations.test.ts
// Tests fuer Cron: Einladungen nach 30 Tagen ablaufen lassen

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockLt = vi.fn();
const mockSelect = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          lt: mockLt.mockReturnValue({
            select: mockSelect,
          }),
        }),
      }),
    })),
  })),
}));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
});

describe('GET /api/cron/expire-invitations', () => {
  it('laesst abgelaufene Einladungen ablaufen', async () => {
    mockSelect.mockResolvedValue({
      data: [{ id: 'inv-1' }, { id: 'inv-2' }],
      error: null,
    });

    const { GET } = await import('@/app/api/cron/expire-invitations/route');
    const request = new Request('http://localhost/api/cron/expire-invitations', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.expired).toBe(2);
  });

  it('gibt 401 ohne CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/expire-invitations/route');
    const request = new Request('http://localhost/api/cron/expire-invitations', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });

  it('gibt 500 bei fehlendem CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const { GET } = await import('@/app/api/cron/expire-invitations/route');
    const request = new Request('http://localhost/api/cron/expire-invitations', {
      headers: { authorization: 'Bearer test' },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(500);
  });

  it('gibt 500 bei Datenbankfehler', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });

    const { GET } = await import('@/app/api/cron/expire-invitations/route');
    const request = new Request('http://localhost/api/cron/expire-invitations', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(500);
  });
});
