// __tests__/components/care/ConsultationSlotCard.test.tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ConsultationSlotCard } from '@/components/care/ConsultationSlotCard';
import type { ConsultationSlot } from '@/lib/care/types';

const mockSlot: ConsultationSlot = {
  id: 'slot-1',
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

describe('ConsultationSlotCard', () => {
  afterEach(() => cleanup());

  it('sollte Titel und Host-Name anzeigen', () => {
    render(<ConsultationSlotCard slot={mockSlot} />);
    expect(screen.getByText('Offene Sprechstunde')).toBeDefined();
    expect(screen.getByText('Quartierslotse Schmidt')).toBeDefined();
  });

  it('sollte Buchen-Button anzeigen wenn Slot verfuegbar', () => {
    render(<ConsultationSlotCard slot={mockSlot} onBook={() => {}} />);
    expect(screen.getByText('Termin buchen')).toBeDefined();
  });

  it('sollte Teilnehmen-Button anzeigen wenn Slot aktiv', () => {
    const activeSlot = { ...mockSlot, status: 'waiting' as const, join_url: 'https://meet.jit.si/test' };
    render(<ConsultationSlotCard slot={activeSlot} onJoin={() => {}} />);
    expect(screen.getByText('Jetzt teilnehmen')).toBeDefined();
  });

  it('sollte keinen Button anzeigen wenn Slot abgeschlossen', () => {
    const doneSlot = { ...mockSlot, status: 'completed' as const };
    render(<ConsultationSlotCard slot={doneSlot} />);
    expect(screen.queryByText('Termin buchen')).toBeNull();
    expect(screen.queryByText('Jetzt teilnehmen')).toBeNull();
  });
});
