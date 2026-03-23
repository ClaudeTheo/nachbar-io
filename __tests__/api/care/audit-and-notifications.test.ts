// __tests__/api/care/audit-and-notifications.test.ts
// Block D.12: Audit-Logging fuer sensible medizinische Statuswechsel
// Block D.13: Notification-Fehlerbehandlung (Push/Mail Fehler = Business OK)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Shared Mocks ---
const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const mockWriteAuditLog = vi.fn();
const mockSendAppointmentPush = vi.fn();
const mockSendAppointmentEmail = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  requireSubscription: () => mockRequireSubscription(),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 }),
}));

vi.mock('@/lib/care/logger', () => ({
  createCareLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  }),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock('@/lib/consultation/notifications', () => ({
  sendAppointmentPush: (...args: unknown[]) => mockSendAppointmentPush(...args),
  sendAppointmentEmail: (...args: unknown[]) => mockSendAppointmentEmail(...args),
}));

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

function createMockSupabase(slot: Record<string, unknown>) {
  return {
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
      // users table (fuer Benachrichtigungen)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { display_name: 'Max Mustermann', email: 'doc@test.de' },
              error: null,
            }),
          }),
        }),
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// =============================================================================
// D.13 — Notification-Fehlerbehandlung: Push/Mail Fehler blockiert NICHT Business
// =============================================================================
describe('Notification-Fehlerbehandlung', () => {
  const slot = {
    id: 'slot-1',
    host_user_id: 'doctor-1',
    booked_by: 'patient-1',
    status: 'proposed',
    proposed_by: 'doctor-1',
    scheduled_at: '2026-04-01T10:00:00Z',
    doctor_id: null,
  };

  it('Business-Operation erfolgreich trotz Push-Fehler', async () => {
    mockSendAppointmentPush.mockRejectedValue(new Error('Push-Service down'));
    mockSendAppointmentEmail.mockResolvedValue(undefined);

    mockRequireAuth.mockResolvedValue({ supabase: createMockSupabase(slot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });

    // Business bleibt 200 trotz Push-Fehler
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('confirmed');
  });

  it('Business-Operation erfolgreich trotz E-Mail-Fehler', async () => {
    mockSendAppointmentPush.mockResolvedValue(undefined);
    mockSendAppointmentEmail.mockRejectedValue(new Error('Resend API 500'));

    mockRequireAuth.mockResolvedValue({ supabase: createMockSupabase(slot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });

    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('Business-Operation erfolgreich trotz BEIDER Notification-Fehler', async () => {
    mockSendAppointmentPush.mockRejectedValue(new Error('Push down'));
    mockSendAppointmentEmail.mockRejectedValue(new Error('Mail down'));

    mockRequireAuth.mockResolvedValue({ supabase: createMockSupabase(slot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });

    // KERN: DB-Update war erfolgreich, Status ist confirmed
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].status).toBe('confirmed');
  });
});

// =============================================================================
// D.12 — Audit-Logging bei Consent-Aenderungen
// =============================================================================
describe('Audit-Logging bei Consent', () => {
  it('Consent-Grant schreibt Audit-Log mit korrekten Feldern', async () => {
    const mockUser = { id: 'user-audit-1' };

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'c-1' }, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }));

    vi.doMock('@/lib/care/consent', () => ({
      getConsentsForUser: vi.fn().mockResolvedValue({
        sos: { granted: false, granted_at: null, consent_version: '1.0' },
        checkin: { granted: false, granted_at: null, consent_version: '1.0' },
        medications: { granted: false, granted_at: null, consent_version: '1.0' },
        care_profile: { granted: false, granted_at: null, consent_version: '1.0' },
        emergency_contacts: { granted: false, granted_at: null, consent_version: '1.0' },
      }),
    }));

    const { POST } = await import('@/app/api/care/consent/route');
    const request = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { sos: true, medications: true } }),
    });
    await POST(request as never);

    // Audit-Log muss geschrieben werden
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(), // supabase
      expect.objectContaining({
        seniorId: mockUser.id,
        actorId: mockUser.id,
        eventType: 'consent_updated',
        metadata: expect.objectContaining({
          changes: expect.arrayContaining([
            expect.stringContaining('sos:granted'),
            expect.stringContaining('medications:granted'),
          ]),
        }),
      }),
    );
  });

  it('Audit-Log-Fehler crasht NICHT die Consent-Route', async () => {
    mockWriteAuditLog.mockRejectedValue(new Error('Audit-DB down'));

    const mockUser = { id: 'user-audit-2' };

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'c-2' }, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }));

    vi.doMock('@/lib/care/consent', () => ({
      getConsentsForUser: vi.fn().mockResolvedValue({
        sos: { granted: false, granted_at: null, consent_version: '1.0' },
        checkin: { granted: false, granted_at: null, consent_version: '1.0' },
        medications: { granted: false, granted_at: null, consent_version: '1.0' },
        care_profile: { granted: false, granted_at: null, consent_version: '1.0' },
        emergency_contacts: { granted: false, granted_at: null, consent_version: '1.0' },
      }),
    }));

    const { POST } = await import('@/app/api/care/consent/route');
    const request = new Request('http://localhost/api/care/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: { sos: true } }),
    });
    const response = await POST(request as never);

    // Business bleibt erfolgreich trotz Audit-Fehler
    expect(response.status).toBe(200);
  });
});
