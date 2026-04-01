// __tests__/integration/speed-dial-sos.test.ts
// Integrationstests: Speed-Dial + SOS + Emergency-Profile Kiosk
// Testet das Zusammenspiel der 3 neuen Kiosk-API-Endpoints
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ============================================================
// Mock-Setup: Speed-Dial nutzt @/lib/supabase/server,
// SOS + Emergency-Profile nutzen @supabase/supabase-js direkt
// ============================================================

// --- Supabase Server Mock (fuer Speed-Dial) ---
const mockGetUser = vi.fn();
const mockFromServer = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromServer,
  })),
}));

// --- Supabase JS Mock (fuer SOS + Emergency-Profile) ---
const mockMaybeSingle = vi.fn();
const mockInsertDirect = vi.fn();
const mockSelectDirect = vi.fn();
const mockEqDirect = vi.fn();
const mockGtDirect = vi.fn();
const mockIsDirect = vi.fn();

function chainable() {
  const obj: Record<string, unknown> = {};
  obj.select = mockSelectDirect.mockReturnValue(obj);
  obj.eq = mockEqDirect.mockReturnValue(obj);
  obj.gt = mockGtDirect.mockReturnValue(obj);
  obj.is = mockIsDirect.mockReturnValue(obj);
  obj.maybeSingle = mockMaybeSingle;
  obj.insert = mockInsertDirect;
  return obj;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => chainable()),
  })),
}));

// --- Crypto-Mock ---
vi.mock('@/modules/care/services/crypto', () => ({
  decrypt: vi.fn((val: string) => val),
  encrypt: vi.fn((val: string) => val),
}));

// Hilfsfunktion: Request erstellen
function makeRequest(url: string, opts?: RequestInit) {
  return new Request(url, opts) as unknown as NextRequest;
}

// ============================================================
// Integration Tests: 8 Szenarien
// ============================================================

describe('Speed-Dial + SOS + Emergency-Profile Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Env fuer SOS + Emergency-Profile
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.KIOSK_DEVICE_TOKEN = 'valid-device-token';
  });

  // --- Test 1: Speed-Dial max 5 Constraint ---
  it('Speed-Dial: lehnt 6. Favorit ab (max 5)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Count-Abfrage: bereits 5 Eintraege vorhanden
    const mockCountHead = vi.fn().mockReturnValue({ count: 5, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });
    mockFromServer.mockReturnValue({ select: mockCountSelect });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'user-1',
        source_type: 'caregiver_link',
        source_id: 'c6',
        sort_order: 1,
      }),
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('5 Favoriten');
  });

  // --- Test 2: Caregiver kann Favorit fuer Bewohner anlegen ---
  it('Speed-Dial: Caregiver-erstellter Favorit hat created_by', async () => {
    // Auth-User ist der Caregiver
    mockGetUser.mockResolvedValue({ data: { user: { id: 'caregiver-1' } } });

    // Count: 0 bestehende Eintraege
    const mockCountHead = vi.fn().mockReturnValue({ count: 0, error: null });
    const mockCountEq = vi.fn().mockReturnValue(mockCountHead());
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    // Insert: neuer Favorit mit created_by = caregiver-1
    const insertedEntry = {
      id: 'new-1',
      user_id: 'bewohner-1',
      source_type: 'caregiver_link',
      source_id: 'contact-1',
      sort_order: 1,
      created_by: 'caregiver-1',
    };
    const mockSingle = vi.fn().mockReturnValue({ data: insertedEntry, error: null });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsertFn = vi.fn().mockReturnValue({ select: mockInsertSelect });

    mockFromServer.mockImplementation(() => {
      if (!mockFromServer._callIdx) mockFromServer._callIdx = 0;
      mockFromServer._callIdx++;
      if (mockFromServer._callIdx === 1) return { select: mockCountSelect };
      return { insert: mockInsertFn };
    });

    const { POST } = await import('@/app/api/speed-dial/route');
    const res = await POST(makeRequest('http://localhost/api/speed-dial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'bewohner-1',
        source_type: 'caregiver_link',
        source_id: 'contact-1',
        sort_order: 1,
      }),
    }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.created_by).toBe('caregiver-1');
    expect(body.user_id).toBe('bewohner-1');
  });

  // --- Test 3: Speed-Dial resolve gibt display_name aus Profil zurueck ---
  it('Speed-Dial: resolve gibt display_name aus Profil zurueck', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Erster Aufruf: speed_dial_favorites laden
    const mockOrder = vi.fn().mockReturnValue({
      data: [
        {
          id: 'f1',
          user_id: 'user-1',
          source_type: 'caregiver_link',
          source_id: 'profile-1',
          sort_order: 1,
        },
      ],
      error: null,
    });
    const mockEqFav = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelectFav = vi.fn().mockReturnValue({ eq: mockEqFav });

    // Zweiter Aufruf: profiles fuer caregiver_link Aufloesung
    const mockSingle = vi.fn().mockReturnValue({
      data: { id: 'profile-1', full_name: 'Erika Mustermann', avatar_url: '/img/erika.jpg' },
      error: null,
    });
    const mockEqProfile = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelectProfile = vi.fn().mockReturnValue({ eq: mockEqProfile });

    mockFromServer.mockImplementation((table: string) => {
      if (table === 'speed_dial_favorites') return { select: mockSelectFav };
      if (table === 'profiles') return { select: mockSelectProfile };
      return {};
    });

    const { GET } = await import('@/app/api/speed-dial/route');
    const res = await GET(makeRequest('http://localhost/api/speed-dial'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].display_name).toBe('Erika Mustermann');
    expect(body[0].avatar_url).toBe('/img/erika.jpg');
    expect(body[0].target_user_id).toBe('profile-1');
  });

  // --- Test 4: SOS sos_opened schreibt nur Audit, kein Push ---
  it('SOS: sos_opened loggt nur Audit, kein Push', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: nicht gefunden → ENV-Fallback greift
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // audit_log insert
    mockInsertDirect.mockResolvedValueOnce({ error: null });

    const req = makeRequest('http://localhost/api/escalation/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': 'valid-device-token',
      },
      body: JSON.stringify({ deviceId: 'dev-1', event_type: 'sos_opened' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logged).toBe(true);
    // Kein alerted/caregiver_count — nur Audit
    expect(body.alerted).toBeUndefined();
    expect(body.caregiver_count).toBeUndefined();
  });

  // --- Test 5: SOS sos_alerted sendet Push an Caregiver ---
  it('SOS: sos_alerted sendet Push an alle Caregiver', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: Geraet mit user_id
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'k1', user_id: 'resident-1', device_token: 'valid-device-token' },
    });
    // Dedup-Check: kein Duplikat
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    // escalation_events insert
    mockInsertDirect.mockResolvedValueOnce({ error: null });
    // audit_log insert
    mockInsertDirect.mockResolvedValueOnce({ error: null });
    // caregiver_links: 2 Angehoerige
    mockIsDirect.mockReturnValueOnce({
      data: [
        { caregiver_id: 'cg-1' },
        { caregiver_id: 'cg-2' },
      ],
    });
    // Push-Intent Audit-Log insert
    mockInsertDirect.mockResolvedValueOnce({ error: null });

    const req = makeRequest('http://localhost/api/escalation/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': 'valid-device-token',
      },
      body: JSON.stringify({
        deviceId: 'dev-1',
        event_type: 'sos_alerted',
        userId: 'resident-1',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerted).toBe(true);
    expect(body.caregiver_count).toBe(2);
  });

  // --- Test 6: SOS Dedup 10 Minuten ---
  it('SOS: sos_alerted Dedup — 429 bei wiederholtem Alarm', async () => {
    const { POST } = await import('@/app/api/escalation/sos/route');

    // kiosk_devices: Geraet gefunden
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'k1', user_id: 'resident-1', device_token: 'valid-device-token' },
    });
    // Dedup-Check: bereits ein Eintrag innerhalb der letzten 10 Minuten
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'esc-1', event_type: 'sos_alerted', created_at: new Date().toISOString() },
    });

    const req = makeRequest('http://localhost/api/escalation/sos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': 'valid-device-token',
      },
      body: JSON.stringify({
        deviceId: 'dev-1',
        event_type: 'sos_alerted',
        userId: 'resident-1',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('10-Min');
  });

  // --- Test 7: Emergency-Profile ohne Device-Token → 401 ---
  it('Emergency Profile: ohne Device-Token → 401', async () => {
    const { GET } = await import('@/app/api/care/emergency-profile/kiosk/route');

    const req = makeRequest(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-1',
      { method: 'GET' },
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Token');
  });

  // --- Test 8: Emergency-Profile unbekanntes Geraet → 403 ---
  it('Emergency Profile: unbekanntes Geraet → 403', async () => {
    // ENV-Token auf anderen Wert setzen, damit Fallback NICHT greift
    process.env.KIOSK_DEVICE_TOKEN = 'correct-token';

    const { GET } = await import('@/app/api/care/emergency-profile/kiosk/route');

    // kiosk_devices: kein Geraet gefunden
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const req = makeRequest(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-1',
      {
        method: 'GET',
        headers: { 'x-device-token': 'wrong-token' },
      },
    );

    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Gerät');
  });
});
