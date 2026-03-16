// lib/__tests__/doctors.test.ts
// Unit-Tests fuer Arzt-Profil- und Bewertungs-Validierung (Pro Medical)

import { describe, it, expect } from 'vitest';
import { validateDoctorProfile, validateReview } from '../doctors';

describe('validateDoctorProfile', () => {
  it('akzeptiert gueltiges Profil', () => {
    const result = validateDoctorProfile({
      specialization: ['Allgemeinmedizin', 'Innere Medizin'],
      bio: 'Erfahrener Arzt mit 20 Jahren Praxis.',
      visible: true,
      accepts_new_patients: true,
      video_consultation: false,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('akzeptiert leeres Objekt (alle Felder optional)', () => {
    const result = validateDoctorProfile({});
    expect(result.valid).toBe(true);
  });

  it('lehnt nicht-Array specialization ab', () => {
    const result = validateDoctorProfile({ specialization: 'Allgemeinmedizin' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Array');
  });

  it('lehnt specialization mit leeren Strings ab', () => {
    const result = validateDoctorProfile({ specialization: ['Allgemeinmedizin', ''] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nicht-leerer String');
  });

  it('lehnt specialization mit Nicht-Strings ab', () => {
    const result = validateDoctorProfile({ specialization: ['Allgemeinmedizin', 42] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nicht-leerer String');
  });

  it('lehnt Bio mit mehr als 2000 Zeichen ab', () => {
    const result = validateDoctorProfile({ bio: 'x'.repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('2000 Zeichen');
  });

  it('akzeptiert Bio mit genau 2000 Zeichen', () => {
    const result = validateDoctorProfile({ bio: 'x'.repeat(2000) });
    expect(result.valid).toBe(true);
  });

  it('lehnt nicht-boolean visible ab', () => {
    const result = validateDoctorProfile({ visible: 'ja' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Boolean');
  });

  it('lehnt nicht-boolean accepts_new_patients ab', () => {
    const result = validateDoctorProfile({ accepts_new_patients: 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Boolean');
  });

  it('lehnt ungueltige quarter_ids ab', () => {
    const result = validateDoctorProfile({ quarter_ids: ['nicht-uuid'] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('UUID');
  });
});

describe('validateReview', () => {
  it('akzeptiert Bewertung 1-5 mit Text', () => {
    for (let rating = 1; rating <= 5; rating++) {
      const result = validateReview({ rating, text: 'Sehr guter Arzt' });
      expect(result.valid).toBe(true);
    }
  });

  it('akzeptiert Bewertung ohne Text', () => {
    const result = validateReview({ rating: 4 });
    expect(result.valid).toBe(true);
  });

  it('lehnt fehlende Bewertung ab', () => {
    const result = validateReview({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('erforderlich');
  });

  it('lehnt Bewertung 0 ab', () => {
    const result = validateReview({ rating: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('zwischen 1 und 5');
  });

  it('lehnt Bewertung 6 ab', () => {
    const result = validateReview({ rating: 6 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('zwischen 1 und 5');
  });

  it('lehnt Dezimalzahl 3.5 ab', () => {
    const result = validateReview({ rating: 3.5 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ganzzahl');
  });

  it('lehnt Text mit mehr als 1000 Zeichen ab', () => {
    const result = validateReview({ rating: 5, text: 'x'.repeat(1001) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1000 Zeichen');
  });

  it('akzeptiert Text mit genau 1000 Zeichen', () => {
    const result = validateReview({ rating: 5, text: 'x'.repeat(1000) });
    expect(result.valid).toBe(true);
  });

  it('lehnt nicht-String Text ab', () => {
    const result = validateReview({ rating: 5, text: 42 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('String');
  });
});
