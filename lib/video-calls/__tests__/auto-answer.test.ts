import { describe, it, expect } from 'vitest';
import {
  isInTimeWindow,
  shouldAutoAnswer,
  type AutoAnswerContact,
  type QuietHoursConfig,
} from '../auto-answer';

describe('isInTimeWindow', () => {
  it('gibt true zurück innerhalb eines Tagesfensters', () => {
    expect(isInTimeWindow('12:00', '08:00', '20:00')).toBe(true);
  });

  it('gibt false zurück außerhalb eines Tagesfensters', () => {
    expect(isInTimeWindow('06:00', '08:00', '20:00')).toBe(false);
  });

  it('gibt true zurück innerhalb eines Overnight-Fensters (vor Mitternacht)', () => {
    expect(isInTimeWindow('23:00', '22:00', '07:00')).toBe(true);
  });

  it('gibt true zurück innerhalb eines Overnight-Fensters (nach Mitternacht)', () => {
    expect(isInTimeWindow('03:00', '22:00', '07:00')).toBe(true);
  });

  it('gibt false zurück außerhalb eines Overnight-Fensters', () => {
    expect(isInTimeWindow('12:00', '22:00', '07:00')).toBe(false);
  });

  it('gibt true zurück an der Grenze (exakt start)', () => {
    expect(isInTimeWindow('08:00', '08:00', '20:00')).toBe(true);
  });

  it('gibt true zurück an der Grenze (exakt end)', () => {
    expect(isInTimeWindow('20:00', '08:00', '20:00')).toBe(true);
  });
});

describe('shouldAutoAnswer', () => {
  const activeContact: AutoAnswerContact = {
    autoAnswerAllowed: true,
    autoAnswerStart: '08:00',
    autoAnswerEnd: '20:00',
    revokedAt: null,
  };

  const quietHoursOff: QuietHoursConfig = {
    enabled: false,
    start: '22:00',
    end: '07:00',
  };

  it('gibt true zurück wenn alle Bedingungen erfüllt', () => {
    expect(shouldAutoAnswer(activeContact, quietHoursOff, '12:00')).toBe(true);
  });

  it('gibt false zurück wenn auto_answer_allowed = false', () => {
    const contact = { ...activeContact, autoAnswerAllowed: false };
    expect(shouldAutoAnswer(contact, quietHoursOff, '12:00')).toBe(false);
  });

  it('gibt false zurück wenn Link widerrufen', () => {
    const contact = { ...activeContact, revokedAt: '2026-03-17T10:00:00Z' };
    expect(shouldAutoAnswer(contact, quietHoursOff, '12:00')).toBe(false);
  });

  it('gibt false zurück wenn außerhalb Kontakt-Zeitfenster', () => {
    expect(shouldAutoAnswer(activeContact, quietHoursOff, '06:00')).toBe(false);
  });

  it('gibt false zurück wenn in Quiet Hours', () => {
    const quietOn: QuietHoursConfig = { enabled: true, start: '22:00', end: '07:00' };
    expect(shouldAutoAnswer(activeContact, quietOn, '23:30')).toBe(false);
  });

  it('gibt false zurück wenn außerhalb Kontakt-Fenster trotz Nachtzeit', () => {
    // 23:30 ist außerhalb Kontakt-Fenster 08:00-20:00
    expect(shouldAutoAnswer(activeContact, quietHoursOff, '23:30')).toBe(false);
  });

  it('Overnight-Kontaktfenster: Auto-Answer um 23:00 bei 22:00-07:00', () => {
    const nightContact: AutoAnswerContact = {
      autoAnswerAllowed: true,
      autoAnswerStart: '22:00',
      autoAnswerEnd: '07:00',
      revokedAt: null,
    };
    expect(shouldAutoAnswer(nightContact, quietHoursOff, '23:00')).toBe(true);
  });
});
