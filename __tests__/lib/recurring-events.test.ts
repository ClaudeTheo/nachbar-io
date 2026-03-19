// __tests__/lib/recurring-events.test.ts
// Tests fuer wiederkehrende Events

import { describe, it, expect } from 'vitest';
import {
  calculateNextDate,
  isRecurrenceActive,
  RECURRENCE_LABELS,
} from '@/lib/recurring-events';

describe('Wiederkehrende Events', () => {
  describe('calculateNextDate', () => {
    it('berechnet naechste Woche korrekt', () => {
      expect(calculateNextDate('2026-03-20', 'weekly')).toBe('2026-03-27');
    });

    it('berechnet alle 2 Wochen korrekt', () => {
      expect(calculateNextDate('2026-03-20', 'biweekly')).toBe('2026-04-03');
    });

    it('berechnet naechsten Monat korrekt', () => {
      expect(calculateNextDate('2026-03-20', 'monthly')).toBe('2026-04-20');
    });

    it('berechnet naechsten Monat korrekt bei Monatsende', () => {
      // 31. Januar → 28. Februar (kein 31.)
      const result = calculateNextDate('2026-01-31', 'monthly');
      expect(result).toMatch(/^2026-0(2-28|3-03)$/);
    });

    it('berechnet ersten Montag korrekt', () => {
      // 20. Maerz 2026 → erster Montag im April = 6. April
      const result = calculateNextDate('2026-03-20', 'first_monday');
      expect(result).toBe('2026-04-06');
    });

    it('berechnet letzten Freitag korrekt', () => {
      // 20. Maerz 2026 → letzter Freitag im April = 24. April
      const result = calculateNextDate('2026-03-20', 'last_friday');
      expect(result).toBe('2026-04-24');
    });
  });

  describe('isRecurrenceActive', () => {
    it('ist aktiv wenn kein Enddatum gesetzt', () => {
      expect(isRecurrenceActive('2026-12-31', null)).toBe(true);
    });

    it('ist aktiv wenn naechstes Datum vor Enddatum', () => {
      expect(isRecurrenceActive('2026-06-01', '2026-12-31')).toBe(true);
    });

    it('ist aktiv wenn naechstes Datum gleich Enddatum', () => {
      expect(isRecurrenceActive('2026-12-31', '2026-12-31')).toBe(true);
    });

    it('ist NICHT aktiv wenn naechstes Datum nach Enddatum', () => {
      expect(isRecurrenceActive('2027-01-01', '2026-12-31')).toBe(false);
    });
  });

  describe('RECURRENCE_LABELS', () => {
    it('hat Labels fuer alle Regeln', () => {
      expect(RECURRENCE_LABELS.weekly).toBe('Jede Woche');
      expect(RECURRENCE_LABELS.biweekly).toBe('Alle 2 Wochen');
      expect(RECURRENCE_LABELS.monthly).toBe('Jeden Monat');
      expect(RECURRENCE_LABELS.first_monday).toBe('Jeden 1. Montag');
      expect(RECURRENCE_LABELS.last_friday).toBe('Jeden letzten Freitag');
    });
  });
});
