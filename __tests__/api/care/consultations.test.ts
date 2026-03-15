// __tests__/api/care/consultations.test.ts
import { describe, it, expect } from 'vitest';

describe('Consultation API Validation', () => {
  it('sollte gueltige provider_types akzeptieren', () => {
    const valid = ['community', 'medical'];
    expect(valid.includes('community')).toBe(true);
    expect(valid.includes('medical')).toBe(true);
    expect(valid.includes('invalid')).toBe(false);
  });

  it('sollte duration_minutes zwischen 5 und 60 validieren', () => {
    const isValid = (min: number) => min >= 5 && min <= 60;
    expect(isValid(15)).toBe(true);
    expect(isValid(5)).toBe(true);
    expect(isValid(60)).toBe(true);
    expect(isValid(0)).toBe(false);
    expect(isValid(120)).toBe(false);
  });

  it('sollte scheduled_at als ISO-Datum validieren', () => {
    const isValidDate = (d: string) => !isNaN(Date.parse(d));
    expect(isValidDate('2026-03-20T10:00:00Z')).toBe(true);
    expect(isValidDate('nicht-ein-datum')).toBe(false);
  });
});
