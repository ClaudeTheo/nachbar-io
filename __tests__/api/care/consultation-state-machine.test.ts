// __tests__/api/care/consultation-state-machine.test.ts
// Block C.8: Consultation Negotiation E2E (propose → counter → confirm)
// Block C.9: Unerlaubte State Transitions
// Block C.10: Provider-Type / sensible Seiteneffekte

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { canTransition, getAvailableActions } from '@/lib/consultation/appointment-status';
import type { AppointmentStatus, ActorRole } from '@/lib/consultation/appointment-status';

// =============================================================================
// C.8+C.9 — State Machine Unit Tests (canTransition direkt)
// =============================================================================
describe('Appointment State Machine — canTransition', () => {
  // --- Erlaubte Uebergaenge ---
  describe('Erlaubte Uebergaenge', () => {
    it('proposed → confirmed durch Gegenseite (patient, wenn doctor proposed)', () => {
      expect(canTransition('proposed', 'confirmed', 'patient', 'doctor')).toBe(true);
    });

    it('proposed → counter_proposed durch Gegenseite', () => {
      expect(canTransition('proposed', 'counter_proposed', 'patient', 'doctor')).toBe(true);
    });

    it('proposed → declined durch Gegenseite', () => {
      expect(canTransition('proposed', 'declined', 'patient', 'doctor')).toBe(true);
    });

    it('counter_proposed → confirmed durch Gegenseite', () => {
      expect(canTransition('counter_proposed', 'confirmed', 'doctor', 'patient')).toBe(true);
    });

    it('counter_proposed → counter_proposed durch Gegenseite (Ping-Pong)', () => {
      expect(canTransition('counter_proposed', 'counter_proposed', 'doctor', 'patient')).toBe(true);
    });

    it('confirmed → cancelled durch beide (patient)', () => {
      expect(canTransition('confirmed', 'cancelled', 'patient', 'doctor')).toBe(true);
    });

    it('confirmed → cancelled durch beide (doctor)', () => {
      expect(canTransition('confirmed', 'cancelled', 'doctor', 'patient')).toBe(true);
    });

    it('confirmed → active durch doctor', () => {
      expect(canTransition('confirmed', 'active', 'doctor', 'patient')).toBe(true);
    });

    it('active → completed durch doctor', () => {
      expect(canTransition('active', 'completed', 'doctor', 'patient')).toBe(true);
    });
  });

  // --- VERBOTENE Uebergaenge (Block C.9) ---
  describe('Verbotene Uebergaenge', () => {
    it('proposed → confirmed durch Vorschlagenden SELBST verboten', () => {
      expect(canTransition('proposed', 'confirmed', 'doctor', 'doctor')).toBe(false);
    });

    it('proposed → confirmed durch Patient der selbst vorgeschlagen hat verboten', () => {
      expect(canTransition('proposed', 'confirmed', 'patient', 'patient')).toBe(false);
    });

    it('confirmed → active durch patient verboten (nur doctor)', () => {
      expect(canTransition('confirmed', 'active', 'patient', 'doctor')).toBe(false);
    });

    it('active → completed durch patient verboten (nur doctor)', () => {
      expect(canTransition('active', 'completed', 'patient', 'doctor')).toBe(false);
    });

    it('completed → irgendwas: kein Rueckweg moeglich', () => {
      const targets: AppointmentStatus[] = ['proposed', 'confirmed', 'active', 'cancelled', 'declined'];
      for (const target of targets) {
        expect(canTransition('completed', target, 'doctor', 'patient')).toBe(false);
        expect(canTransition('completed', target, 'patient', 'doctor')).toBe(false);
      }
    });

    it('cancelled → irgendwas: kein Rueckweg moeglich', () => {
      const targets: AppointmentStatus[] = ['proposed', 'confirmed', 'active', 'completed'];
      for (const target of targets) {
        expect(canTransition('cancelled', target, 'doctor', 'patient')).toBe(false);
        expect(canTransition('cancelled', target, 'patient', 'doctor')).toBe(false);
      }
    });

    it('declined → irgendwas: kein Rueckweg moeglich', () => {
      const targets: AppointmentStatus[] = ['proposed', 'confirmed', 'active', 'completed', 'cancelled'];
      for (const target of targets) {
        expect(canTransition('declined', target, 'doctor', 'patient')).toBe(false);
        expect(canTransition('declined', target, 'patient', 'doctor')).toBe(false);
      }
    });

    it('proposed → active direkt verboten (muss ueber confirmed)', () => {
      expect(canTransition('proposed', 'active', 'doctor', 'patient')).toBe(false);
    });

    it('proposed → completed direkt verboten', () => {
      expect(canTransition('proposed', 'completed', 'doctor', 'patient')).toBe(false);
    });
  });

  // --- getAvailableActions ---
  describe('getAvailableActions', () => {
    it('Patient sieht confirm/counter/decline bei proposed (von doctor)', () => {
      const actions = getAvailableActions('proposed', 'patient', 'doctor');
      expect(actions).toContain('confirm');
      expect(actions).toContain('counter_propose');
      expect(actions).toContain('decline');
      expect(actions).not.toContain('cancel');
      expect(actions).not.toContain('start');
    });

    it('Doctor sieht NICHTS bei proposed (wenn er selbst proposed hat)', () => {
      const actions = getAvailableActions('proposed', 'doctor', 'doctor');
      expect(actions).toHaveLength(0);
    });

    it('Doctor bei confirmed: start + cancel', () => {
      const actions = getAvailableActions('confirmed', 'doctor', 'patient');
      expect(actions).toContain('start');
      expect(actions).toContain('cancel');
    });

    it('Patient bei confirmed: nur cancel', () => {
      const actions = getAvailableActions('confirmed', 'patient', 'doctor');
      expect(actions).toContain('cancel');
      expect(actions).not.toContain('start');
    });

    it('Keine Aktionen bei completed', () => {
      expect(getAvailableActions('completed', 'doctor', 'patient')).toHaveLength(0);
      expect(getAvailableActions('completed', 'patient', 'doctor')).toHaveLength(0);
    });

    it('Patient bei active: join', () => {
      const actions = getAvailableActions('active', 'patient', 'doctor');
      expect(actions).toContain('join');
    });
  });
});

// =============================================================================
// C.10 — Provider-Type Seiteneffekte bei confirm
// =============================================================================
describe('Consultation confirm Seiteneffekte', () => {
  const mockRequireAuth = vi.fn();
  const mockRequireSubscription = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpdateEq = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockUpdateEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  });

  async function setupAndPatch(
    slotData: Record<string, unknown>,
    action: string,
    extraBody: Record<string, unknown> = {}
  ) {
    vi.doMock('@/lib/care/api-helpers', () => ({
      requireAuth: () => mockRequireAuth(),
      requireSubscription: () => mockRequireSubscription(),
      unauthorizedResponse: () =>
        new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 }),
    }));

    vi.doMock('@/lib/care/logger', () => ({
      createCareLogger: () => ({
        info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
      }),
    }));

    vi.doMock('@/lib/consultation/notifications', () => ({
      sendAppointmentPush: vi.fn().mockResolvedValue(undefined),
      sendAppointmentEmail: vi.fn().mockResolvedValue(undefined),
    }));

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'consultation_slots') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: slotData, error: null }),
              }),
            }),
            update: mockUpdate,
          };
        }
        // users table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { display_name: 'Test', email: 'test@test.de' }, error: null }),
            }),
          }),
        };
      }),
    };

    mockRequireAuth.mockResolvedValue({ supabase: mockSupabase, user: { id: slotData.booked_by } });
    mockRequireSubscription.mockResolvedValue({ plan: 'plus', status: 'active' });

    const { PATCH } = await import('@/app/api/care/consultations/[id]/route');
    const req = new NextRequest('http://localhost/api/care/consultations/slot-1', {
      method: 'PATCH',
      body: JSON.stringify({ action, ...extraBody }),
    });
    return PATCH(req, { params: Promise.resolve({ id: 'slot-1' }) });
  }

  it('confirm setzt provider_type=community und generiert join_url', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
      provider_type: 'medical', // ACHTUNG: War medical
    };

    const res = await setupAndPatch(slot, 'confirm');
    expect(res.status).toBe(200);

    // Pruefe: update wurde mit provider_type=community aufgerufen
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('confirmed');
    expect(updateArg.join_url).toMatch(/^https:\/\/meet\.jit\.si\/nachbar-/);
    // BEKANNTES VERHALTEN: confirm ueberschreibt provider_type auf community
    // Dies ist ein Seiteneffekt der in der Route hart codiert ist
    expect(updateArg.provider_type).toBe('community');
  });

  it('counter_propose setzt proposed_by und neues Datum', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    const res = await setupAndPatch(slot, 'counter_propose', {
      scheduled_at: '2026-04-05T14:00:00Z',
    });
    expect(res.status).toBe(200);

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('counter_proposed');
    expect(updateArg.scheduled_at).toBe('2026-04-05T14:00:00Z');
    expect(updateArg.previous_scheduled_at).toBe('2026-04-01T10:00:00Z');
    expect(updateArg.proposed_by).toBe('patient-1');
  });

  it('cancel setzt cancelled_by auf den Actor', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'confirmed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    const res = await setupAndPatch(slot, 'cancel');
    expect(res.status).toBe(200);

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('cancelled');
    expect(updateArg.cancelled_by).toBe('patient-1');
  });

  it('counter_propose ohne scheduled_at gibt 400', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'proposed',
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    const res = await setupAndPatch(slot, 'counter_propose');
    expect(res.status).toBe(400);
  });

  it('unerlaubter Statusuebergang gibt 422', async () => {
    const slot = {
      id: 'slot-1',
      host_user_id: 'doctor-1',
      booked_by: 'patient-1',
      status: 'completed', // Terminal-Status
      proposed_by: 'doctor-1',
      scheduled_at: '2026-04-01T10:00:00Z',
    };

    const res = await setupAndPatch(slot, 'confirm');
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('nicht erlaubt');
  });
});
