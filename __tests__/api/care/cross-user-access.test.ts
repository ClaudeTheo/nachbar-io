// __tests__/api/care/cross-user-access.test.ts
// Block A.3: Cross-User Object Access — User A darf NICHT auf Daten von User B zugreifen
// Testet Consultation-Slots, Consent-Routen und Medications

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- User-IDs ---
const USER_A = { id: 'user-aaa-111' };
const USER_B = { id: 'user-bbb-222' };

// --- Mock-State (wird pro Test umkonfiguriert) ---
let currentUser = USER_A;
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: currentUser } })),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireSubscription: (...args: unknown[]) => mockRequireSubscription(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 }),
  requireCareAccess: vi.fn().mockResolvedValue('caregiver'),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/logger', () => ({
  createCareLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
  }),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: unknown) => v),
  encryptFields: vi.fn((data: unknown) => data),
  decryptFields: vi.fn((data: unknown) => data),
  decryptFieldsArray: vi.fn((data: unknown) => data),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
}));

vi.mock('@/lib/care/consent', () => ({
  getConsentsForUser: vi.fn().mockResolvedValue({
    sos: { granted: true, granted_at: '2026-01-01', consent_version: '1.0' },
    checkin: { granted: false, granted_at: null, consent_version: '1.0' },
    medications: { granted: true, granted_at: '2026-01-01', consent_version: '1.0' },
    care_profile: { granted: false, granted_at: null, consent_version: '1.0' },
    emergency_contacts: { granted: false, granted_at: null, consent_version: '1.0' },
  }),
}));

vi.mock('@/lib/consultation/notifications', () => ({
  sendAppointmentPush: vi.fn().mockResolvedValue(undefined),
  sendAppointmentEmail: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  currentUser = USER_A;
});

// =============================================================================
// Consultation: User A kann Termin von User B nicht bearbeiten
// =============================================================================
describe('Consultation Cross-User Access', () => {
  it('PATCH gibt 403 wenn User A den Termin von User B bearbeiten will', async () => {
    // User A ist eingeloggt
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'slot-1',
                host_user_id: 'doctor-1',
                booked_by: USER_B.id, // <-- gehoert User B!
                status: 'proposed',
                proposed_by: 'doctor-1',
                scheduled_at: '2026-04-01T10:00:00Z',
              },
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan: 'plus', status: 'active' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: USER_A });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeDefined();
    // WICHTIG: Keine Metadaten im Fehlertext (kein booked_by, kein host_user_id)
    expect(JSON.stringify(body)).not.toContain(USER_B.id);
    expect(JSON.stringify(body)).not.toContain('doctor-1');
  });

  it('PATCH gibt 404 wenn Termin nicht existiert (kein Datenleak)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan: 'plus', status: 'active' },
              error: null,
            }),
          }),
        }),
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: USER_A });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Consent: User A kann NUR eigene Consents lesen (API nutzt auth.getUser())
// =============================================================================
describe('Consent Cross-User Isolation', () => {
  it('GET /api/care/consent gibt NUR Consents des authentifizierten Users zurueck', async () => {
    // getConsentsForUser wird mit der User-ID des eingeloggten Users aufgerufen
    const { getConsentsForUser } = await import('@/lib/care/consent');

    const { GET } = await import('@/app/api/care/consent/route');
    const request = new Request('http://localhost/api/care/consent');
    await GET(request as never);

    // Verifiziere: getConsentsForUser wurde mit USER_A.id aufgerufen, nicht mit einer fremden ID
    expect(getConsentsForUser).toHaveBeenCalledWith(
      expect.anything(), // supabase client
      USER_A.id,
    );
    // Sicherstellung: NICHT mit User B aufgerufen
    expect(getConsentsForUser).not.toHaveBeenCalledWith(
      expect.anything(),
      USER_B.id,
    );
  });

  it('POST /api/care/consent speichert IMMER fuer authentifizierten User', async () => {
    // Auch wenn jemand user_id im Body mitschickt, wird die Session-ID verwendet
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ data: [], error: null }),
      }),
      upsert: mockUpsert,
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { POST } = await import('@/app/api/care/consent/route');
    const request = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        features: { sos: true },
        user_id: USER_B.id, // ANGRIFF: versucht fremde User-ID einzuschleusen
      }),
    });
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    // getConsentsForUser sollte mit der Session-User-ID aufgerufen werden
    const { getConsentsForUser } = await import('@/lib/care/consent');
    expect(getConsentsForUser).toHaveBeenCalledWith(expect.anything(), USER_A.id);
  });
});

// =============================================================================
// Consent-Revoke: User A kann NUR eigene Consents widerrufen
// =============================================================================
describe('Consent-Revoke Cross-User Isolation', () => {
  it('POST /api/care/consent/revoke verwendet Session-User, nicht Body-User', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null }),
          }),
        }),
      }),
    });

    mockFrom.mockReturnValue({
      update: mockUpdate,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { POST } = await import('@/app/api/care/consent/revoke/route');
    const request = new Request('http://localhost/api/care/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: 'medications',
        user_id: USER_B.id, // ANGRIFF: fremde User-ID
      }),
    });
    const response = await POST(request as never);

    expect(response.status).toBe(200);

    // Pruefe: update wurde mit USER_A.id aufgerufen (aus Session)
    // Die eq-Chain muss user_id = USER_A.id enthalten
    const updateCalls = mockUpdate.mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);
    // Der erste eq nach update sollte 'user_id' sein
    const eqMock = mockUpdate.mock.results[0].value.eq;
    expect(eqMock).toHaveBeenCalledWith('user_id', USER_A.id);
  });
});
