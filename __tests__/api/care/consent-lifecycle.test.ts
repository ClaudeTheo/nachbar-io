// __tests__/api/care/consent-lifecycle.test.ts
// Block B.4: Consent-Idempotenz (doppeltes POST = kein Duplikat)
// Block B.5: Consent-Revoke-Wechsel (grant -> revoke -> re-grant)

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = { id: 'user-lifecycle-1' };
const mockUpsert = vi.fn();
const mockInsert = vi.fn();

// Tracking: Welche Consent-States liegen gerade vor
let currentConsents: Record<string, { granted: boolean; granted_at: string | null; consent_version: string }>;

// Tiefere Supabase-Chain fuer revoke-Route (select→eq→eq→maybeSingle)
function buildChainableMock() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'ec-1', granted: true }, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null });
  chain.data = [];
  chain.error = null;
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn().mockImplementation(() => {
      const chain = buildChainableMock();
      chain.upsert = mockUpsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null }),
        }),
      });
      chain.insert = mockInsert.mockResolvedValue({ error: null });
      chain.update = vi.fn().mockReturnValue(buildChainableMock());
      chain.delete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      return chain;
    }),
  }),
}));

vi.mock('@/lib/care/consent', () => ({
  getConsentsForUser: vi.fn(() => Promise.resolve(currentConsents)),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function resetConsents(overrides: Record<string, boolean> = {}) {
  currentConsents = {
    sos: { granted: false, granted_at: null, consent_version: '1.0' },
    checkin: { granted: false, granted_at: null, consent_version: '1.0' },
    medications: { granted: false, granted_at: null, consent_version: '1.0' },
    care_profile: { granted: false, granted_at: null, consent_version: '1.0' },
    emergency_contacts: { granted: false, granted_at: null, consent_version: '1.0' },
  };
  for (const [key, val] of Object.entries(overrides)) {
    if (key in currentConsents) {
      currentConsents[key].granted = val;
      if (val) currentConsents[key].granted_at = '2026-01-01T00:00:00Z';
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  resetConsents();
});

// =============================================================================
// B.4 — Consent-Idempotenz: Doppeltes POST darf keinen Duplikat-Datensatz erzeugen
// =============================================================================
describe('Consent Idempotenz', () => {
  it('identisches POST zweimal hintereinander: kein doppelter Upsert wenn Status gleich', async () => {
    // Erster Aufruf: sos noch nicht granted → upsert wird aufgerufen
    resetConsents();

    const { POST } = await import('@/app/api/care/consent/route');
    const makeRequest = () =>
      new Request('http://localhost/api/care/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: { sos: true } }),
      });

    const res1 = await POST(makeRequest() as never);
    expect(res1.status).toBe(200);
    const upsertCallsAfterFirst = mockUpsert.mock.calls.length;
    expect(upsertCallsAfterFirst).toBeGreaterThan(0);

    // Zweiter Aufruf: sos bereits granted → kein Upsert (Skip weil currentGranted === newGranted)
    vi.resetModules();
    resetConsents({ sos: true }); // Simuliere: nach erstem Grant ist sos=true

    const { POST: POST2 } = await import('@/app/api/care/consent/route');
    mockUpsert.mockClear();
    mockInsert.mockClear();

    const res2 = await POST2(makeRequest() as never);
    expect(res2.status).toBe(200);

    // KERNAUSSAGE: Kein erneuter Upsert, weil Status identisch
    expect(mockUpsert).not.toHaveBeenCalled();
    // Auch kein History-Insert fuer unveraenderten Status
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('mehrfaches POST mit gleichem Body erzeugt keine History-Duplikate', async () => {
    resetConsents({ sos: true, checkin: true });

    const { POST } = await import('@/app/api/care/consent/route');
    const makeRequest = () =>
      new Request('http://localhost/api/care/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: { sos: true, checkin: true } }),
      });

    // Dreimal hintereinander
    await POST(makeRequest() as never);
    await POST(makeRequest() as never);
    await POST(makeRequest() as never);

    // Kein Upsert, kein History-Insert — Status war bereits identisch
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// =============================================================================
// B.5 — Consent-Revoke-Wechsel: grant → revoke → re-grant
// =============================================================================
describe('Consent Revoke-Lifecycle', () => {
  it('grant -> revoke -> re-grant: Zustand konsistent, kein Zombie', async () => {
    // Phase 1: Grant sos
    resetConsents();
    const { POST: GrantPost } = await import('@/app/api/care/consent/route');
    const grantReq = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { sos: true } }),
    });
    const res1 = await GrantPost(grantReq as never);
    expect(res1.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalled();

    // Phase 2: Revoke sos
    vi.resetModules();
    mockUpsert.mockClear();
    mockInsert.mockClear();
    resetConsents({ sos: true });

    const { POST: RevokePost } = await import('@/app/api/care/consent/revoke/route');
    const revokeReq = new Request('http://localhost/api/care/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'sos', delete_data: false }),
    });
    const res2 = await RevokePost(revokeReq as never);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.revoked).toContain('sos');

    // Phase 3: Re-grant sos
    vi.resetModules();
    mockUpsert.mockClear();
    mockInsert.mockClear();
    resetConsents({ sos: false }); // nach Revoke ist sos=false

    const { POST: ReGrantPost } = await import('@/app/api/care/consent/route');
    const reGrantReq = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { sos: true } }),
    });
    const res3 = await ReGrantPost(reGrantReq as never);
    expect(res3.status).toBe(200);

    // Upsert MUSS aufgerufen worden sein (Status hat sich geaendert: false→true)
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('mehrfacher Revoke-Versuch auf bereits widerrufenes Feature: kein Fehler', async () => {
    // sos bereits widerrufen (granted=false)
    resetConsents({ sos: false });

    const { POST } = await import('@/app/api/care/consent/revoke/route');
    const revokeReq = new Request('http://localhost/api/care/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'sos', delete_data: false }),
    });
    const res = await POST(revokeReq as never);

    // Kein Crash — Route gibt 200 zurueck (idempotent)
    // oder 200 mit already_revoked Info
    expect(res.status).toBeLessThanOrEqual(200);
  });

  it('sos-Revoke kaskadiert emergency_contacts (Abhaengigkeit)', async () => {
    resetConsents({ sos: true, emergency_contacts: true });

    const { POST } = await import('@/app/api/care/consent/revoke/route');
    const revokeReq = new Request('http://localhost/api/care/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'sos', delete_data: false }),
    });
    const res = await POST(revokeReq as never);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Beide Features muessen widerrufen sein
    expect(body.revoked).toContain('sos');
    expect(body.revoked).toContain('emergency_contacts');
  });
});
