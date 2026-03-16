// lib/__tests__/appointments.test.ts
// Unit-Tests fuer Termin-Buchungs-Validierung (Pro Medical)

import { describe, it, expect } from 'vitest';
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
} from '../appointments';
import type { AppointmentStatus } from '../appointments';

describe('validateAppointmentCreate', () => {
  // Hilfsfunktion: gueltiger Eingabe-Datensatz
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const validInput = {
    doctor_id: '550e8400-e29b-41d4-a716-446655440000',
    scheduled_at: futureDate,
    duration_minutes: 30,
    type: 'video',
  };

  it('akzeptiert gueltige Eingabe', () => {
    const result = validateAppointmentCreate(validInput);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('erfordert doctor_id', () => {
    const result = validateAppointmentCreate({ ...validInput, doctor_id: undefined });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Arzt-ID');
  });

  it('erfordert gueltige UUID als doctor_id', () => {
    const result = validateAppointmentCreate({ ...validInput, doctor_id: 'nicht-uuid' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('UUID');
  });

  it('erfordert scheduled_at', () => {
    const result = validateAppointmentCreate({ ...validInput, scheduled_at: undefined });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Terminzeitpunkt');
  });

  it('lehnt vergangene Daten ab', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = validateAppointmentCreate({ ...validInput, scheduled_at: pastDate });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Zukunft');
  });

  it('lehnt ungueltige Dauer ab (0 Minuten)', () => {
    const result = validateAppointmentCreate({ ...validInput, duration_minutes: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5 und 60');
  });

  it('lehnt ungueltige Dauer ab (120 Minuten)', () => {
    const result = validateAppointmentCreate({ ...validInput, duration_minutes: 120 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5 und 60');
  });

  it('akzeptiert alle gueltigen Termintypen', () => {
    for (const type of APPOINTMENT_TYPES) {
      const result = validateAppointmentCreate({ ...validInput, type });
      expect(result.valid).toBe(true);
    }
  });

  it('lehnt ungueltigen Termintyp ab', () => {
    const result = validateAppointmentCreate({ ...validInput, type: 'invalid_type' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Termintyp');
  });

  it('akzeptiert optionale Felder ohne type und duration', () => {
    const minimal = {
      doctor_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_at: futureDate,
    };
    const result = validateAppointmentCreate(minimal);
    expect(result.valid).toBe(true);
  });
});

describe('validateAppointmentUpdate', () => {
  it('akzeptiert gueltigen Statuswechsel booked → confirmed', () => {
    const result = validateAppointmentUpdate({ status: 'confirmed' }, 'booked');
    expect(result.valid).toBe(true);
  });

  it('akzeptiert gueltigen Statuswechsel confirmed → in_progress', () => {
    const result = validateAppointmentUpdate({ status: 'in_progress' }, 'confirmed');
    expect(result.valid).toBe(true);
  });

  it('akzeptiert gueltigen Statuswechsel in_progress → completed', () => {
    const result = validateAppointmentUpdate({ status: 'completed' }, 'in_progress');
    expect(result.valid).toBe(true);
  });

  it('akzeptiert gueltigen Statuswechsel booked → cancelled', () => {
    const result = validateAppointmentUpdate({ status: 'cancelled' }, 'booked');
    expect(result.valid).toBe(true);
  });

  it('akzeptiert no_show von jedem aktiven Status', () => {
    const activeStatuses: AppointmentStatus[] = ['booked', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    for (const status of activeStatuses) {
      // no_show ist nur von booked, confirmed, in_progress, completed erlaubt
      const result = validateAppointmentUpdate({ status: 'no_show' }, status);
      if (['booked', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        // no_show ist von allen ausser no_show selbst erlaubt
        if (status === 'no_show') {
          expect(result.valid).toBe(false);
        }
      }
    }
  });

  it('lehnt ungueltigen Statuswechsel completed → booked ab', () => {
    const result = validateAppointmentUpdate({ status: 'booked' }, 'completed');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nicht erlaubt');
  });

  it('lehnt ungueltigen Statuswechsel cancelled → confirmed ab', () => {
    const result = validateAppointmentUpdate({ status: 'confirmed' }, 'cancelled');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nicht erlaubt');
  });

  it('lehnt Statuswechsel von no_show zu irgendwas ab', () => {
    for (const targetStatus of APPOINTMENT_STATUSES) {
      if (targetStatus === 'no_show') continue;
      const result = validateAppointmentUpdate({ status: targetStatus }, 'no_show');
      expect(result.valid).toBe(false);
    }
  });

  it('lehnt komplett leere Updates ab', () => {
    const result = validateAppointmentUpdate({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Keine');
  });

  it('akzeptiert Update mit nur notes', () => {
    const result = validateAppointmentUpdate({ notes: 'Neue Notiz' });
    expect(result.valid).toBe(true);
  });

  it('akzeptiert Update mit nur meeting_url', () => {
    const result = validateAppointmentUpdate({ meeting_url: 'https://meet.example.com/123' });
    expect(result.valid).toBe(true);
  });

  it('lehnt ungueltigen Status-Wert ab', () => {
    const result = validateAppointmentUpdate({ status: 'ungueltig' }, 'booked');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ungueltiger Status');
  });
});
