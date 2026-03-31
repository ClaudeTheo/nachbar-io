import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMemorySave } from '@/modules/memory/services/facts.service';
import { containsMedicalTerms } from '@/modules/memory/services/medical-blocklist';

vi.mock('@/modules/memory/services/medical-blocklist');

describe('Memory Facts Service', () => {
  describe('validateMemorySave', () => {
    it('blockiert medizinische Begriffe', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(true);

      const result = validateMemorySave({
        category: 'preference',
        key: 'medikament',
        value: 'Nimmt Metformin',
        confidence: 0.9,
        needs_confirmation: false,
      }, { hasConsent: true, factCount: 0, maxFacts: 50 });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('medical_blocked');
    });

    it('blockiert ohne Consent fuer sensitive Kategorien', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(false);

      const result = validateMemorySave({
        category: 'care_need',
        key: 'hilfe',
        value: 'Hilfe beim Einkaufen',
        confidence: 0.9,
        needs_confirmation: false,
      }, { hasConsent: false, factCount: 0, maxFacts: 20 });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('no_consent');
    });

    it('blockiert bei Limit erreicht', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(false);

      const result = validateMemorySave({
        category: 'profile',
        key: 'test',
        value: 'Test',
        confidence: 0.9,
        needs_confirmation: false,
      }, { hasConsent: true, factCount: 50, maxFacts: 50 });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit_reached');
    });

    it('verlangt Bestaetigung bei niedriger Confidence', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(false);

      const result = validateMemorySave({
        category: 'routine',
        key: 'kaffee',
        value: 'Vielleicht Kaffee um 8',
        confidence: 0.5,
        needs_confirmation: false,
      }, { hasConsent: true, factCount: 10, maxFacts: 50 });

      expect(result.allowed).toBe(true);
      expect(result.mode).toBe('confirm');
    });

    it('erlaubt Auto-Save bei hoher Confidence + Basis-Kategorie', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(false);

      const result = validateMemorySave({
        category: 'contact',
        key: 'tochter',
        value: 'Tochter Anna',
        confidence: 0.95,
        needs_confirmation: false,
      }, { hasConsent: true, factCount: 5, maxFacts: 50 });

      expect(result.allowed).toBe(true);
      expect(result.mode).toBe('save');
    });

    it('verlangt immer Bestaetigung fuer sensitive Kategorien', () => {
      vi.mocked(containsMedicalTerms).mockReturnValue(false);

      const result = validateMemorySave({
        category: 'care_need',
        key: 'hilfe',
        value: 'Hilfe beim Treppensteigen',
        confidence: 0.95,
        needs_confirmation: false,
      }, { hasConsent: true, factCount: 5, maxFacts: 20 });

      expect(result.allowed).toBe(true);
      expect(result.mode).toBe('confirm');
    });
  });
});
