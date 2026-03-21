import { describe, it, expect } from 'vitest';
import { calculateExpiry, availableServings, isNewMeal, formatMealTime } from '@/lib/meals';

describe('Mitess-Plätze Hilfsfunktionen', () => {
  describe('calculateExpiry', () => {
    it('Portion: nächster Tag', () => {
      const result = calculateExpiry('portion', '2026-03-21', null);
      expect(result).toContain('2026-03-22');
    });

    it('Einladung mit Uhrzeit', () => {
      const result = calculateExpiry('invitation', '2026-03-22', '19:00');
      // Vergleiche mit der erwarteten lokalen Zeit (Timezone-unabhaengig)
      const expected = new Date('2026-03-22T19:00:00').toISOString();
      expect(result).toBe(expected);
    });

    it('Einladung ohne Uhrzeit: Ende des Tages', () => {
      const result = calculateExpiry('invitation', '2026-03-22', null);
      expect(result).toContain('2026-03-22');
      expect(new Date(result).getHours()).toBe(23);
    });
  });

  describe('availableServings', () => {
    it('berechnet freie Plätze', () => {
      expect(availableServings(5, 3)).toBe(2);
    });

    it('nie negativ', () => {
      expect(availableServings(2, 5)).toBe(0);
    });
  });

  describe('isNewMeal', () => {
    it('true für gerade erstellt', () => {
      expect(isNewMeal(new Date().toISOString())).toBe(true);
    });

    it('false für gestern', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(isNewMeal(yesterday)).toBe(false);
    });
  });

  describe('formatMealTime', () => {
    it('formatiert HH:MM', () => {
      expect(formatMealTime('19:00')).toBe('19:00 Uhr');
    });

    it('leer bei null', () => {
      expect(formatMealTime(null)).toBe('');
    });

    it('formatiert HH:MM:SS', () => {
      expect(formatMealTime('14:30:00')).toBe('14:30 Uhr');
    });
  });
});
