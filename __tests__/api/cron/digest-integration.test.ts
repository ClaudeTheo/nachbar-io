// __tests__/api/cron/digest-integration.test.ts
// Integrationstests fuer den woechentlichen Quartier-Digest Cron-Job

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Env-Vars
vi.stubEnv('CRON_SECRET', 'test-cron-secret-123');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

// Konfigurierbare Mock-Daten
let mockQuarters: { id: string; name: string }[] = [];
let mockHelpRequests: { id: string; title: string }[] = [];
let mockAlerts: { id: string; category: string }[] = [];
let mockEvents: { id: string; title: string }[] = [];
let mockNewMembers: { user_id: string }[] = [];
let mockQuarterMembers: { user_id: string }[] = [];

// Proxy-basierter Supabase Chain-Mock (robust, rekursiv)
function makeProxyChain(tableResolver: (table: string) => { data: unknown[]; count: number }) {
  const supabase = {
    from: vi.fn((table: string) => {
      const result = tableResolver(table);
      // Erstelle einen Proxy der fuer alle Methoden sich selbst zurueckgibt
      // und am Ende (await/then) den richtigen Wert liefert
      const handler: ProxyHandler<object> = {
        get(_target, prop) {
          if (prop === 'then') {
            // Thenable: await/Promise.all ruft .then(onFulfilled) auf
            return (onFulfilled: (v: unknown) => unknown) =>
              Promise.resolve(onFulfilled({ data: result.data, error: null, count: result.count }));
          }
          if (prop === 'single' || prop === 'maybeSingle') {
            return () => Promise.resolve({ data: result.data[0] ?? null, error: null });
          }
          // Alle anderen Methoden geben den Proxy zurueck (Chaining)
          return () => new Proxy({}, handler);
        },
      };
      return new Proxy({}, handler);
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return supabase;
}

vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: vi.fn(() =>
    makeProxyChain((table: string) => {
      switch (table) {
        case 'quarters': return { data: mockQuarters, count: mockQuarters.length };
        case 'help_requests': return { data: mockHelpRequests, count: mockHelpRequests.length };
        case 'alerts': return { data: mockAlerts, count: mockAlerts.length };
        case 'events': return { data: mockEvents, count: mockEvents.length };
        case 'household_members':
          // Fuer Quartier-Members (Push-Empfaenger)
          if (mockQuarterMembers.length > 0) return { data: mockQuarterMembers, count: mockQuarterMembers.length };
          return { data: mockNewMembers, count: mockNewMembers.length };
        default: return { data: [], count: 0 };
      }
    }),
  ),
}));

// Anthropic SDK Mock — muss als Klasse funktionieren (new Anthropic(...))
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Diese Woche gab es viel Aktivitaet im Quartier.' }],
});

vi.mock('@anthropic-ai/sdk', () => {
  function MockAnthropic() {
    return { messages: { create: mockCreate } };
  }
  return { default: MockAnthropic };
});

// Push + Notification + Heartbeat Mocks
const mockSendPush = vi.fn().mockResolvedValue(undefined);
const mockSafeInsert = vi.fn().mockResolvedValue(undefined);
const mockWriteHeartbeat = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/care/channels/push', () => ({
  sendPush: (...args: unknown[]) => mockSendPush(...args),
}));
vi.mock('@/lib/notifications-server', () => ({
  safeInsertNotification: (...args: unknown[]) => mockSafeInsert(...args),
}));
vi.mock('@/lib/care/cron-heartbeat', () => ({
  writeCronHeartbeat: (...args: unknown[]) => mockWriteHeartbeat(...args),
}));

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/cron/digest', { headers: headers ?? {} });
}

describe('Cron: Digest Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuarters = [];
    mockHelpRequests = [];
    mockAlerts = [];
    mockEvents = [];
    mockNewMembers = [];
    mockQuarterMembers = [];
  });

  // --- Auth-Tests ---

  it('gibt 401 ohne Authorization-Header', async () => {
    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('gibt 401 mit falschem Secret', async () => {
    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('gibt 500 wenn CRON_SECRET fehlt', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const mod = await import('@/app/api/cron/digest/route');
    const res = await mod.GET(makeRequest());
    expect(res.status).toBe(500);
    vi.stubEnv('CRON_SECRET', 'test-cron-secret-123');
  });

  it('ueberspringt wenn ANTHROPIC_API_KEY fehlt', async () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('no_api_key');

    process.env.ANTHROPIC_API_KEY = origKey;
  });

  // --- Logik-Tests ---

  it('gibt 200 mit digestsSent=0 wenn keine aktiven Quartiere', async () => {
    mockQuarters = [];

    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.digestsSent).toBe(0);
  });

  it('ueberspringt Quartiere ohne Aktivitaet', async () => {
    mockQuarters = [{ id: 'q1', name: 'Stilles Quartier' }];
    // Alle counts auf 0 = keine Aktivitaet

    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.digestsSent).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('sendet Digest wenn Quartier Aktivitaet hat', async () => {
    mockQuarters = [{ id: 'q1', name: 'Bad Saeckingen' }];
    mockHelpRequests = [{ id: 'p1', title: 'Einkaufshilfe' }];
    mockAlerts = [{ id: 'a1', category: 'other' }];
    mockQuarterMembers = [{ user_id: 'u1' }, { user_id: 'u2' }];

    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('nutzt Fallback-Text wenn Claude API fehlschlaegt', async () => {
    mockQuarters = [{ id: 'q1', name: 'Test Quartier' }];
    mockHelpRequests = [{ id: 'p1', title: 'Test' }];
    mockQuarterMembers = [{ user_id: 'u1' }];
    mockCreate.mockRejectedValueOnce(new Error('API down'));

    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // Trotz Claude-Fehler sollte Digest gesendet werden (Fallback-Text)
  });

  it('schreibt Cron-Heartbeat nach Durchlauf', async () => {
    const { GET } = await import('@/app/api/cron/digest/route');
    await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));

    expect(mockWriteHeartbeat).toHaveBeenCalledWith(
      expect.anything(),
      'digest',
      expect.objectContaining({ digestsSent: 0 }),
    );
  });

  it('Response enthaelt Timestamp', async () => {
    const { GET } = await import('@/app/api/cron/digest/route');
    const res = await GET(makeRequest({ Authorization: 'Bearer test-cron-secret-123' }));
    const body = await res.json();

    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});
