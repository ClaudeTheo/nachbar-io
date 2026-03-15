// __tests__/lib/care/consultation-types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  ConsultationProviderType,
  ConsultationStatus,
  ConsultationSlot,
  ConsultationConsent,
} from '@/lib/care/types';

describe('Consultation Types', () => {
  it('sollte ein ConsultationSlot-Objekt akzeptieren', () => {
    const slot: ConsultationSlot = {
      id: '123',
      quarter_id: 'q1',
      provider_type: 'community',
      host_user_id: 'u1',
      host_name: 'Quartierslotse Schmidt',
      title: 'Offene Sprechstunde',
      scheduled_at: '2026-03-20T10:00:00Z',
      duration_minutes: 15,
      status: 'scheduled',
      booked_by: null,
      booked_at: null,
      room_id: null,
      join_url: null,
      notes: null,
      created_at: '2026-03-15T00:00:00Z',
      updated_at: '2026-03-15T00:00:00Z',
    };
    expect(slot.provider_type).toBe('community');
    expect(slot.status).toBe('scheduled');
  });

  it('sollte alle provider_type-Werte akzeptieren', () => {
    const types: ConsultationProviderType[] = ['community', 'medical'];
    expect(types).toHaveLength(2);
  });

  it('sollte alle status-Werte akzeptieren', () => {
    const statuses: ConsultationStatus[] = [
      'scheduled', 'waiting', 'active', 'completed', 'cancelled', 'no_show',
    ];
    expect(statuses).toHaveLength(6);
  });

  it('sollte ein ConsultationConsent-Objekt akzeptieren', () => {
    const consent: ConsultationConsent = {
      id: '456',
      user_id: 'u1',
      consent_version: 'v1',
      consented_at: '2026-03-15T00:00:00Z',
      provider_type: 'medical',
    };
    expect(consent.provider_type).toBe('medical');
  });
});
