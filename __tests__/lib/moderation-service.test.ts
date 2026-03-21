// Tests fuer Wortfilter (preFilter)
import { describe, it, expect } from 'vitest';
import { preFilter } from '@/lib/moderation/word-filter';

describe('preFilter — Wortfilter', () => {
  describe('blockierte Begriffe', () => {
    it('erkennt Beleidigungen', () => {
      const result = preFilter('Du bist ein Arschloch');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('beleidigung');
    });

    it('erkennt Beleidigungen case-insensitive', () => {
      const result = preFilter('HURENSOHN');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('beleidigung');
    });

    it('erkennt Bedrohungen', () => {
      const result = preFilter('Ich bringe dich um');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('bedrohung');
    });

    it('erkennt Bedrohungen mit Varianten', () => {
      const result = preFilter('Ich werde dich umbringen');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('bedrohung');
    });

    it('erkennt Spam-Links', () => {
      const result = preFilter('Klicke auf http://spam-seite.ru/free');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('spam-link');
    });

    it('erkennt Spam-Links mit .tk TLD', () => {
      const result = preFilter('Besuche https://angebot.tk/deal');
      expect(result.blocked).toBe(true);
      expect(result.matchedPatterns).toContain('spam-link');
    });
  });

  describe('verdaechtige Muster (suspicious)', () => {
    it('erkennt Off-Platform-Kontaktversuche', () => {
      const result = preFilter('Schreib mir auf WhatsApp');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(true);
      expect(result.matchedPatterns).toContain('off-platform-kontakt');
    });

    it('erkennt Telegram-Verweis', () => {
      const result = preFilter('Melde dich bei mir via Telegram');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(true);
      expect(result.matchedPatterns).toContain('off-platform-kontakt');
    });

    it('erkennt Scam-Muster', () => {
      const result = preFilter('Gratis iPhone zu verschenken!');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(true);
      expect(result.matchedPatterns).toContain('scam-angebot');
    });

    it('erkennt Krypto-Scams', () => {
      const result = preFilter('Mit Bitcoin schnelles Geld verdienen');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(true);
    });
  });

  describe('normale Texte', () => {
    it('laesst normale Nachbarschafts-Texte durch', () => {
      const result = preFilter('Hallo, hat jemand eine Bohrmaschine zum Ausleihen?');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('laesst Marktplatz-Angebote durch', () => {
      const result = preFilter('Verkaufe gebrauchten Rasenmaeher fuer 50 Euro');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('laesst freundliche Gruesze durch', () => {
      const result = preFilter('Vielen Dank fuer die Hilfe, liebe Nachbarn!');
      expect(result.blocked).toBe(false);
      expect(result.suspicious).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });
  });

  describe('Regex-Sicherheit', () => {
    it('setzt lastIndex korrekt zurueck bei wiederholten Aufrufen', () => {
      // Erster Aufruf
      const result1 = preFilter('Du Arschloch');
      expect(result1.blocked).toBe(true);

      // Zweiter Aufruf mit gleichem Muster muss auch funktionieren
      const result2 = preFilter('Du Arschloch');
      expect(result2.blocked).toBe(true);

      // Dritter Aufruf mit normalem Text
      const result3 = preFilter('Hallo Nachbarn');
      expect(result3.blocked).toBe(false);
    });
  });
});
