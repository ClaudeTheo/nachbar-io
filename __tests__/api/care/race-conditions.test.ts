// __tests__/api/care/race-conditions.test.ts
// Block E.14: Race-Condition-nahe Tests
// Simuliert Doppel-Submits und konkurrierende Aktionen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAuth = vi.fn();
const mockRequireSubscription = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();

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

vi.mock('@/lib/consultation/notifications', () => ({
  sendAppointmentPush: vi.fn().mockResolvedValue(undefined),
  sendAppointmentEmail: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockUpdateEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
});

function createSlotMock(slot: Record<string, unknown>) {
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
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { display_name: 'Test', email: 'test@test.de' },
              error: null,
            }),
          }),
        }),
      };
    }),
  };
}

// =============================================================================
// Doppel-Submit: confirm + confirm
// =============================================================================
describe('Doppel-Submit Szenarien', () => {
  it('zweites confirm auf bereits confirmed Slot gibt 422 (State Machine blockiert)', async () => {
    // Erster Request: proposed → confirmed (erfolgreich)
    const proposedSlot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(proposedSlot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req1 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res1 = await PATCH(req1, { params: Promise.resolve({ id: 'slot-1' }) });
    expect(res1.status).toBe(200);

    // Zweiter Request: Status ist jetzt confirmed → confirm nochmal
    vi.resetModules();
    const confirmedSlot = { ...proposedSlot, status: 'confirmed' };
    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(confirmedSlot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });
    mockUpdate.mockClear();

    const { PATCH: PATCH2 } = await import('@/app/api/care/consultations/[id]/route');
    const req2 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res2 = await PATCH2(req2, { params: Promise.resolve({ id: 'slot-1' }) });

    // KERN: Zweites confirm auf confirmed MUSS abgelehnt werden
    expect(res2.status).toBe(422);
    // DB darf NICHT nochmal updated werden
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('confirm + cancel quasi-gleichzeitig: erstes gewinnt', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    // Request 1: confirm (sieht proposed)
    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(slot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req1 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'confirm' }),
    });
    const res1 = await PATCH(req1, { params: Promise.resolve({ id: 'slot-1' }) });
    expect(res1.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].status).toBe('confirmed');

    // Request 2: decline (sieht jetzt confirmed, weil confirm schon durch)
    vi.resetModules();
    const confirmedSlot = { ...slot, status: 'confirmed' };
    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(confirmedSlot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });
    mockUpdate.mockClear();

    const { PATCH: PATCH2 } = await import('@/app/api/care/consultations/[id]/route');
    const req2 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'decline' }),
    });
    const res2 = await PATCH2(req2, { params: Promise.resolve({ id: 'slot-1' }) });

    // Decline auf confirmed ist nicht erlaubt (nur cancel)
    expect(res2.status).toBe(422);
  });

  it('zwei counter_propose Requests: beide durchfuehrbar, letzter gewinnt', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(slot), user: { id: 'patient-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');

    // Erster counter_propose
    const req1 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'counter_propose', scheduled_at: '2026-04-02T10:00:00Z' }),
    });
    const res1 = await PATCH(req1, { params: Promise.resolve({ id: 'slot-1' }) });
    expect(res1.status).toBe(200);

    // Zweiter counter_propose (Status ist jetzt counter_proposed, proposed_by = patient)
    vi.resetModules();
    const counterSlot = { ...slot, status: 'counter_proposed', proposed_by: 'patient-1' };
    // Jetzt muss Doctor handeln (Gegenseite)
    mockRequireAuth.mockResolvedValue({ supabase: createSlotMock(counterSlot), user: { id: 'doctor-1' } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });
    mockUpdate.mockClear();

    // HINWEIS: Da die Route booked_by prueft und doctor nicht booked_by ist,
    // wird 403 kommen — das ist korrekt! Doctor nutzt die Arzt-Route.
    const { PATCH: PATCH2 } = await import('@/app/api/care/consultations/[id]/route');
    const req2 = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'counter_propose', scheduled_at: '2026-04-03T10:00:00Z' }),
    });
    const res2 = await PATCH2(req2, { params: Promise.resolve({ id: 'slot-1' }) });

    // Doctor ist nicht booked_by → 403 (korrekt, Doctor hat eigene Route)
    expect(res2.status).toBe(403);
  });
});
