// __tests__/api/cron/waste-reminder.test.ts
// Tests fuer Cron: Muellabfuhr Push-Erinnerungen

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

const CRON_SECRET = 'test-waste-cron-secret';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', CRON_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
});

// Hilfsfunktion: Supabase-Kette simulieren (rekursiver Proxy)
function setupChain(responses: Record<string, { data: unknown; error: unknown }>) {
  mockFrom.mockImplementation((table: string) => {
    const resp = responses[table] || { data: [], error: null };
    // Rekursiver Proxy: Jeder Method-Aufruf gibt den Proxy zurueck,
    // bis man .data oder .error abfragt
    const createProxy = (): unknown => {
      return new Proxy(resp, {
        get(target, prop) {
          if (prop === 'data' || prop === 'error') return target[prop as keyof typeof target];
          if (prop === 'then') return undefined; // Kein Promise
          return vi.fn().mockReturnValue(createProxy());
        },
      });
    };
    return createProxy();
  });
}

describe('GET /api/cron/waste-reminder', () => {
  it('gibt 401 ohne korrekte Authentifizierung', async () => {
    const { GET } = await import('@/app/api/cron/waste-reminder/route');
    const request = new Request('http://localhost/api/cron/waste-reminder', {
      headers: { authorization: 'Bearer falsches-secret' },
    });
    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });

  it('gibt 500 ohne CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const { GET } = await import('@/app/api/cron/waste-reminder/route');
    const request = new Request('http://localhost/api/cron/waste-reminder', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    expect(response.status).toBe(500);
  });

  it('gibt 0 queued wenn keine Termine morgen', async () => {
    setupChain({
      waste_collection_dates: { data: [], error: null },
      waste_schedules: { data: [], error: null },
    });

    const { GET } = await import('@/app/api/cron/waste-reminder/route');
    const request = new Request('http://localhost/api/cron/waste-reminder', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.queued).toBe(0);
  });

  it('enthaelt success, queued, schedules, date und timestamp in Antwort', async () => {
    setupChain({
      waste_collection_dates: { data: [], error: null },
      waste_schedules: { data: [], error: null },
    });

    const { GET } = await import('@/app/api/cron/waste-reminder/route');
    const request = new Request('http://localhost/api/cron/waste-reminder', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const response = await GET(request as never);
    const json = await response.json();

    expect(json).toHaveProperty('success');
    expect(json).toHaveProperty('queued');
    expect(json).toHaveProperty('date');
    expect(json).toHaveProperty('timestamp');
  });
});
