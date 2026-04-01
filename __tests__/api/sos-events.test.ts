// __tests__/api/sos-events.test.ts
// Tests fuer SOS Event-Splitting: sos_opened (nur Log) vs sos_alerted (Log + Push)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks fuer Supabase-Chainable-Queries
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGt = vi.fn();
const mockIs = vi.fn();

function chainable() {
  const obj: Record<string, unknown> = {};
  obj.select = mockSelect.mockReturnValue(obj);
  obj.eq = mockEq.mockReturnValue(obj);
  obj.gt = mockGt.mockReturnValue(obj);
  obj.is = mockIs.mockReturnValue(obj);
  obj.maybeSingle = mockMaybeSingle;
  obj.insert = mockInsert;
  return obj;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => chainable()),
  })),
}));

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/escalation/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/escalation/sos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.KIOSK_DEVICE_TOKEN = 'valid-device-token';
  });

  // --- Auth-Tests ---

  it('gibt 401 ohne x-device-token Header', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');
    const req = makeRequest({ deviceId: 'dev-1', event_type: 'sos_opened' });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Token');
  });

  it('gibt 403 bei ungueltigem Device-Token', async () => {
    process.env.KIOSK_DEVICE_TOKEN = 'correct-token';
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: nicht gefunden
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'sos_opened' },
      { 'x-device-token': 'wrong-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(403);
  });

  it('gibt 400 bei unbekanntem event_type', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: nicht gefunden → ENV-Fallback greift
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'invalid_type' },
      { 'x-device-token': 'valid-device-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('event_type');
  });

  // --- sos_opened ---

  it('sos_opened: schreibt Audit-Log und gibt logged: true zurueck', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: nicht gefunden → ENV-Fallback
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // audit_log insert
    mockInsert.mockResolvedValueOnce({ error: null });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'sos_opened' },
      { 'x-device-token': 'valid-device-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logged).toBe(true);
  });

  // --- sos_alerted ---

  it('sos_alerted: gibt 429 bei Duplikat innerhalb 10 Minuten', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: Geraet mit user_id gefunden
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'k1', user_id: 'resident-1', device_token: 'valid-device-token' },
    });
    // escalation_events Dedup-Check: Eintrag existiert bereits
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'esc-1', event_type: 'sos_alerted', created_at: new Date().toISOString() },
    });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'sos_alerted', userId: 'resident-1' },
      { 'x-device-token': 'valid-device-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('10-Min');
  });

  it('sos_alerted: erstellt Eskalation + benachrichtigt Angehoerige', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: Geraet mit user_id
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'k1', user_id: 'resident-1', device_token: 'valid-device-token' },
    });
    // escalation_events Dedup-Check: kein Duplikat
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // escalation_events insert
    mockInsert.mockResolvedValueOnce({ error: null });
    // audit_log insert
    mockInsert.mockResolvedValueOnce({ error: null });

    // caregiver_links select → simuliert durch select-chain
    // Wir muessen den select-Aufruf fuer caregiver_links mocken
    // Da select() immer dasselbe Objekt zurueckgibt, nutzen wir mockSelect
    // Die Kette endet nicht mit maybeSingle, sondern das Ergebnis kommt direkt
    // Wir brauchen einen separaten Mechanismus — der chainable gibt bei
    // is() das data-Feld zurueck, daher mocken wir is() spezifisch
    mockIs.mockReturnValueOnce({
      data: [
        { caregiver_id: 'cg-1' },
        { caregiver_id: 'cg-2' },
      ],
    });
    // Push-Intent Audit-Log insert (fuer jeden Caregiver)
    mockInsert.mockResolvedValueOnce({ error: null });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'sos_alerted', userId: 'resident-1' },
      { 'x-device-token': 'valid-device-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerted).toBe(true);
    expect(body.caregiver_count).toBe(2);
  });

  it('sos_alerted: gibt caregiver_count 0 wenn keine Angehoerigen', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: nicht gefunden → ENV-Fallback
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // Dedup-Check: kein Duplikat
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // escalation_events + audit insert
    mockInsert.mockResolvedValueOnce({ error: null });
    mockInsert.mockResolvedValueOnce({ error: null });
    // caregiver_links: keine Angehoerigen
    mockIs.mockReturnValueOnce({ data: [] });
    // Push-Intent Audit-Log (leer, aber insert wird trotzdem aufgerufen)
    mockInsert.mockResolvedValueOnce({ error: null });

    const req = makeRequest(
      { deviceId: 'dev-1', event_type: 'sos_alerted', userId: 'resident-1' },
      { 'x-device-token': 'valid-device-token' }
    );
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerted).toBe(true);
    expect(body.caregiver_count).toBe(0);
  });
});
