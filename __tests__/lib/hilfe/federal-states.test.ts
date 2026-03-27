// __tests__/lib/hilfe/federal-states.test.ts
// Unit-Tests fuer Bundesland-Regeln und Validierungshelfer

import { describe, it, expect } from 'vitest';
import {
  getAvailableStates,
  getStateRules,
  isStateAvailable,
  validateHelperAge,
  validateHourlyRate,
  getMaxClients,
} from '@/lib/hilfe/federal-states';

describe('federal-states', () => {
  it('getAvailableStates: gibt nur verfuegbare Bundeslaender zurueck (kein HB)', () => {
    const available = getAvailableStates();
    const codes = available.map((s) => s.state_code);

    expect(codes).toContain('BW');
    expect(codes).toContain('BY');
    expect(codes).toContain('NW');
    expect(codes).not.toContain('HB');
    expect(available.every((s) => s.is_available)).toBe(true);
  });

  it('getStateRules("BW"): gibt korrekte Daten mit max_concurrent_clients=2', () => {
    const bw = getStateRules('BW');

    expect(bw).not.toBeNull();
    expect(bw!.state_code).toBe('BW');
    expect(bw!.state_name).toBe('Baden-Wuerttemberg');
    expect(bw!.max_concurrent_clients).toBe(2);
    expect(bw!.training_required).toBe(false);
    expect(bw!.min_age).toBe(16);
  });

  it('getStateRules("XX"): gibt null fuer unbekanntes Bundesland', () => {
    expect(getStateRules('XX')).toBeNull();
  });

  it('validateHelperAge: akzeptiert 18-Jaehrige, lehnt 15-Jaehrige ab', () => {
    const refDate = new Date('2026-03-27');

    // 18 Jahre alt → akzeptiert (min_age = 16)
    const dob18 = new Date('2008-01-15');
    expect(validateHelperAge('BW', dob18, refDate)).toBe(true);

    // 15 Jahre alt → abgelehnt (min_age = 16)
    const dob15 = new Date('2011-01-15');
    expect(validateHelperAge('BW', dob15, refDate)).toBe(false);

    // Unbekanntes Bundesland → false
    expect(validateHelperAge('XX', dob18, refDate)).toBe(false);
  });

  it('validateHourlyRate: akzeptiert jeden Betrag wenn kein Limit (BW)', () => {
    // BW hat max_hourly_rate_cents = null → unbegrenzt
    expect(validateHourlyRate('BW', 5000)).toBe(true);
    expect(validateHourlyRate('BW', 100000)).toBe(true);

    // Unbekanntes Bundesland → false
    expect(validateHourlyRate('XX', 1000)).toBe(false);
  });

  it('isStateAvailable: BW=true, HB=false', () => {
    expect(isStateAvailable('BW')).toBe(true);
    expect(isStateAvailable('HB')).toBe(false);
    expect(isStateAvailable('XX')).toBe(false);
  });

  it('getMaxClients: BW=2, BY=null', () => {
    expect(getMaxClients('BW')).toBe(2);
    expect(getMaxClients('BY')).toBeNull();
  });
});
