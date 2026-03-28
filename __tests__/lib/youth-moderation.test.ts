// __tests__/lib/youth-moderation.test.ts
import { describe, it, expect } from 'vitest';
import { filterMessage, containsContactInfo } from '@/modules/youth';

describe('Youth Moderation', () => {
  describe('filterMessage', () => {
    it('laesst harmlose Nachrichten durch', () => {
      const result = filterMessage('Hallo, wann soll ich vorbeikommen?');
      expect(result.blocked).toBe(false);
    });

    it('blockiert Beleidigungen', () => {
      const result = filterMessage('Du bist ein Idiot');
      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('Beleidigung');
    });

    it('blockiert Geld-Anfragen', () => {
      const result = filterMessage('Kannst du mir 50 Euro geben?');
      expect(result.blocked).toBe(true);
    });
  });

  describe('containsContactInfo', () => {
    it('erkennt Telefonnummern', () => {
      expect(containsContactInfo('Ruf mich an: 0170 1234567')).toBe(true);
    });

    it('erkennt E-Mail-Adressen', () => {
      expect(containsContactInfo('Schreib an test@gmail.com')).toBe(true);
    });

    it('erkennt Social-Media-Handles', () => {
      expect(containsContactInfo('Add mich auf Instagram @username')).toBe(true);
    });

    it('laesst normalen Text durch', () => {
      expect(containsContactInfo('Treffen wir uns am Brunnen?')).toBe(false);
    });
  });
});
