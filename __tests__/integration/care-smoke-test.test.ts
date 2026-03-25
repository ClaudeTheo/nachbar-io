// __tests__/integration/care-smoke-test.test.ts
// Block E.16: Smoke-Test — Durchgehender Happy Path
// Auth → Consent → Consultation erstellen → Statuswechsel → Notification
// Prueft dass Module sauber ineinandergreifen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// Shared State: Simuliert den Zustand ueber mehrere API-Aufrufe hinweg
// =============================================================================
const PATIENT = { id: 'patient-smoke-1' };
const DOCTOR = { id: 'doctor-smoke-1' };

let consentState: Record<string, { granted: boolean; granted_at: string | null; consent_version: string }>;
let slotState: Record<string, Record<string, unknown>>;

function resetState() {
  consentState = {
    sos: { granted: false, granted_at: null, consent_version: '1.0' },
    checkin: { granted: false, granted_at: null, consent_version: '1.0' },
    medications: { granted: false, granted_at: null, consent_version: '1.0' },
    care_profile: { granted: false, granted_at: null, consent_version: '1.0' },
    emergency_contacts: { granted: false, granted_at: null, consent_version: '1.0' },
  };
  slotState = {};
}

// =============================================================================
// Mocks — so nah an der Realitaet wie moeglich
// =============================================================================
const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
const mockSendAppointmentPush = vi.fn().mockResolvedValue(undefined);
const mockSendAppointmentEmail = vi.fn().mockResolvedValue(undefined);

// Consent-Mocks
vi.mock('@/lib/care/consent', () => ({
  getConsentsForUser: vi.fn(() => Promise.resolve({ ...consentState })),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

// Consent-Route Supabase Mock
let currentMockUser = PATIENT;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: currentMockUser } })),
    },
    from: vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null });
      chain.data = [];
      chain.error = null;
      chain.upsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'consent-1' }, error: null }),
        }),
      });
      chain.insert = vi.fn().mockResolvedValue({ error: null });
      chain.update = vi.fn().mockReturnValue(chain);
      chain.delete = vi.fn().mockReturnValue(chain);
      return chain;
    }),
  }),
}));

// Consultation-Mocks
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  requireSubscription: () => mockRequireSubscription(),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 }),
  requireCareAccess: vi.fn().mockResolvedValue('caregiver'),
}));

vi.mock('@/lib/care/logger', () => ({
  createCareLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  }),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: unknown) => v ? `encrypted:${v}` : v),
  decryptFieldsArray: vi.fn((data: unknown) => data),
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
}));

vi.mock('@/lib/consultation/notifications', () => ({
  sendAppointmentPush: (...args: unknown[]) => mockSendAppointmentPush(...args),
  sendAppointmentEmail: (...args: unknown[]) => mockSendAppointmentEmail(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  currentMockUser = PATIENT;
});

// =============================================================================
// SMOKE TEST: Kompletter Happy Path
// =============================================================================
describe('Care Module Smoke Test — Happy Path', () => {
  it('Schritt 1: Patient erteilt Consent (sos + medications)', async () => {
    vi.resetModules();

    const { POST } = await import('@/app/api/care/consent/route');
    const req = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { sos: true, medications: true } }),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    // Audit-Log wurde geschrieben
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'consent_updated',
        seniorId: PATIENT.id,
      }),
    );

    // State aktualisieren fuer naechsten Schritt
    consentState.sos.granted = true;
    consentState.medications.granted = true;
  });

  it('Schritt 2: Patient liest seine Consents', async () => {
    consentState.sos.granted = true;
    consentState.medications.granted = true;
    vi.resetModules();

    const { GET } = await import('@/app/api/care/consent/route');
    const req = new Request('http://localhost/api/care/consent');
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.has_any_consent).toBe(true);
    expect(body.consents.sos.granted).toBe(true);
    expect(body.consents.medications.granted).toBe(true);
    expect(body.consents.checkin.granted).toBe(false);
  });

  it('Schritt 3: Consultation-Slot erstellen (POST)', async () => {
    vi.resetModules();

    const mockInsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'slot-smoke-1',
        quarter_id: 'q-1',
        provider_type: 'community',
        host_user_id: PATIENT.id,
        host_name: 'Max Mustermann',
        title: 'Nachbarschaftshilfe',
        scheduled_at: '2026-04-10T14:00:00Z',
        duration_minutes: 30,
        notes: null,
      },
      error: null,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsertSingle,
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan: 'plus', status: 'active' },
              error: null,
            }),
          }),
        }),
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: PATIENT });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({
        quarter_id: 'q-1',
        provider_type: 'community',
        host_name: 'Max Mustermann',
        title: 'Nachbarschaftshilfe',
        scheduled_at: '2026-04-10T14:00:00Z',
        duration_minutes: 30,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('slot-smoke-1');
    expect(body.provider_type).toBe('community');

    // State speichern
    slotState['slot-smoke-1'] = body;
  });

  it('Schritt 4: Patient bestaetigt Termin (confirm) → Notifications feuern', async () => {
    vi.resetModules();

    const slot = {
      id: 'slot-smoke-1',
      host_user_id: DOCTOR.id,
      booked_by: PATIENT.id,
      status: 'proposed',
      proposed_by: DOCTOR.id,
      scheduled_at: '2026-04-10T14:00:00Z',
      doctor_id: null,
    };

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'consultation_slots') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: slot, error: null }),
              }),
            }),
            update: mockUpdate,
          };
        }
        // users table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { display_name: 'Dr. Schmidt', email: 'dr@test.de' },
                error: null,
              }),
            }),
          }),
        };
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: PATIENT });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-smoke-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-smoke-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('confirmed');

    // DB-Update korrekt
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('confirmed');
    // join_url wird NICHT mehr vom Patient-Confirm gesetzt — Arzt-Portal setzt sie via sprechstunde.online
    expect(updateArg.join_url).toBeUndefined();

    // Notifications wurden gesendet
    expect(mockSendAppointmentPush).toHaveBeenCalledWith(
      DOCTOR.id,
      'confirmed',
      expect.any(String),
      expect.any(String),
    );
    expect(mockSendAppointmentEmail).toHaveBeenCalledWith(
      'dr@test.de',
      'confirmed',
      expect.any(String),
      expect.any(String),
    );
  });

  it('Schritt 5: Consent widerrufen → Audit-Log geschrieben', async () => {
    consentState.sos.granted = true;
    consentState.medications.granted = true;
    vi.resetModules();

    const { POST } = await import('@/app/api/care/consent/revoke/route');
    const req = new Request('http://localhost/api/care/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature: 'medications', delete_data: true }),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revoked).toContain('medications');
    expect(body.data_deleted).toBe(true);

    // Audit-Log fuer Revoke
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'consent_revoked',
        metadata: expect.objectContaining({
          features: expect.arrayContaining(['medications']),
          delete_data: true,
        }),
      }),
    );
  });
});

// =============================================================================
// SMOKE TEST: Unauthentifizierter Zugriff auf den gesamten Flow
// =============================================================================
describe('Care Module Smoke Test — Unauthentifiziert', () => {
  it('Consent GET ohne Auth → 401', async () => {
    // User auf null setzen
    currentMockUser = null as never;
    vi.resetModules();

    // Mock muss null-User zurueckgeben
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      }),
    }));

    const { GET } = await import('@/app/api/care/consent/route');
    const req = new Request('http://localhost/api/care/consent');
    const res = await GET(req as never);

    expect(res.status).toBe(401);
  });

  it('Consultation POST ohne Auth → 401', async () => {
    vi.resetModules();
    mockRequireAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/care/consultations/route');
    const req = new NextRequest('http://localhost/api/care/consultations', {
      method: 'POST',
      body: JSON.stringify({ quarter_id: 'q-1', provider_type: 'community', host_name: 'Test', scheduled_at: '2026-04-10T14:00:00Z' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('Consultation PATCH ohne Auth → 401', async () => {
    vi.resetModules();
    mockRequireAuth.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });

    expect(res.status).toBe(401);
  });
});
