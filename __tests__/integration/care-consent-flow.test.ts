import { describe, expect, it } from 'vitest';
import { CONSENT_FEATURES, CONSENT_DEPENDENCIES } from '@/lib/care/types';
import { CARE_CONSENT_FEATURES, CARE_CONSENT_LABELS, CARE_CONSENT_DESCRIPTIONS, CURRENT_CONSENT_VERSION } from '@/lib/care/constants';
import { CONSENT_FEATURE_TO_API_ROUTES } from '@/lib/care/consent';

describe('Care Consent Flow (Integration)', () => {
  describe('Consent-Konfiguration', () => {
    it('hat 5 Features in allen Definitionen', () => {
      expect(CONSENT_FEATURES).toHaveLength(5);
      expect(CARE_CONSENT_FEATURES).toHaveLength(5);
      expect(Object.keys(CARE_CONSENT_LABELS)).toHaveLength(5);
      expect(Object.keys(CARE_CONSENT_DESCRIPTIONS)).toHaveLength(5);
      expect(Object.keys(CONSENT_FEATURE_TO_API_ROUTES)).toHaveLength(5);
    });

    it('alle Features sind konsistent', () => {
      for (const feature of CONSENT_FEATURES) {
        expect(CARE_CONSENT_FEATURES).toContain(feature);
        expect(CARE_CONSENT_LABELS[feature]).toBeDefined();
        expect(CARE_CONSENT_DESCRIPTIONS[feature]).toBeDefined();
        expect(CONSENT_FEATURE_TO_API_ROUTES[feature]).toBeDefined();
      }
    });

    it('Consent-Version ist definiert', () => {
      expect(CURRENT_CONSENT_VERSION).toBe('1.0');
    });
  });

  describe('Abhaengigkeitsregeln', () => {
    it('emergency_contacts haengt von sos ab', () => {
      expect(CONSENT_DEPENDENCIES.emergency_contacts).toBe('sos');
    });

    it('andere Features haben keine Abhaengigkeiten', () => {
      expect(CONSENT_DEPENDENCIES.sos).toBeUndefined();
      expect(CONSENT_DEPENDENCIES.checkin).toBeUndefined();
      expect(CONSENT_DEPENDENCIES.medications).toBeUndefined();
      expect(CONSENT_DEPENDENCIES.care_profile).toBeUndefined();
    });
  });

  describe('API-Route-Mapping', () => {
    it('sos mappt auf /api/care/sos', () => {
      expect(CONSENT_FEATURE_TO_API_ROUTES.sos).toContain('/api/care/sos');
    });

    it('checkin mappt auf /api/care/checkin', () => {
      expect(CONSENT_FEATURE_TO_API_ROUTES.checkin).toContain('/api/care/checkin');
    });

    it('medications mappt auf /api/care/medications', () => {
      expect(CONSENT_FEATURE_TO_API_ROUTES.medications).toContain('/api/care/medications');
    });

    it('care_profile mappt auf /api/care/profile', () => {
      expect(CONSENT_FEATURE_TO_API_ROUTES.care_profile).toContain('/api/care/profile');
    });
  });

  describe('UI-Texte', () => {
    it('Labels enthalten echte Umlaute', () => {
      // Täglicher Check-in enthaelt ä
      expect(CARE_CONSENT_LABELS.checkin).toContain('ä');
      // Pruefe dass keine ae/oe/ue Ersetzungen vorkommen
      for (const label of Object.values(CARE_CONSENT_LABELS)) {
        expect(label).not.toMatch(/(?<![a-z])ae(?![a-z])/i);
        expect(label).not.toMatch(/(?<![a-z])oe(?![a-z])/i);
      }
    });

    it('Beschreibungen sind nicht leer', () => {
      for (const desc of Object.values(CARE_CONSENT_DESCRIPTIONS)) {
        expect(desc.length).toBeGreaterThan(10);
      }
    });
  });
});
