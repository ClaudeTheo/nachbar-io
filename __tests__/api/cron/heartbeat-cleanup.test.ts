// __tests__/api/cron/heartbeat-cleanup.test.ts
// Tests fuer Cron: Heartbeat-Cleanup (90-Tage-Retention)

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockDelete = vi.fn();
const mockLt = vi.fn();
const mockSelect = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      delete: mockDelete.mockReturnValue({
        lt: mockLt.mockReturnValue({
          select: mockSelect,
        }),
      }),
    })),
  })),
}));

vi.mock('@/lib/care/constants', () => ({
  HEARTBEAT_RETENTION_DAYS: 90,
}));

const CRON_SECRET = 'test-cron-secret';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
});

describe('GET /api/cron/heartbeat-cleanup', () => {
  it('loescht alte Heartbeats', async () => {
    mockSelect.mockResolvedValue({
      data: [{ id: 'hb-1' }, { id: 'hb-2' }, { id: 'hb-3' }],
      error: null,
    });

    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const request = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.deleted).toBe(3);
    expect(json.retentionDays).toBe(90);
  });

  it('gibt 401 ohne korrekte Authentifizierung', async () => {
    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const request = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: 'Bearer wrong' },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(401);
  });

  it('gibt 500 bei Datenbankfehler', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'Delete failed' },
    });

    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const request = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);

    expect(response.status).toBe(500);
  });

  it('meldet 0 geloeschte Eintraege wenn keine alten vorhanden', async () => {
    mockSelect.mockResolvedValue({
      data: [],
      error: null,
    });

    const { GET } = await import('@/app/api/cron/heartbeat-cleanup/route');
    const request = new Request('http://localhost/api/cron/heartbeat-cleanup', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.deleted).toBe(0);
  });
});
