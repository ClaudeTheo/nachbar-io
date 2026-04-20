import { describe, expect, it } from 'vitest';
import { CARE_CONSENT_FEATURES, CARE_CONSENT_LABELS, CARE_CONSENT_DESCRIPTIONS } from '@/lib/care/constants';

describe('Care Consent Constants', () => {
  it('definiert 6 Consent-Features', () => {
    // ai_onboarding ergaenzt mit Welle C (KI-Assistent Senior-Onboarding)
    expect(CARE_CONSENT_FEATURES).toHaveLength(6);
    expect(CARE_CONSENT_FEATURES).toContain('sos');
    expect(CARE_CONSENT_FEATURES).toContain('checkin');
    expect(CARE_CONSENT_FEATURES).toContain('medications');
    expect(CARE_CONSENT_FEATURES).toContain('care_profile');
    expect(CARE_CONSENT_FEATURES).toContain('emergency_contacts');
    expect(CARE_CONSENT_FEATURES).toContain('ai_onboarding');
  });

  it('hat Labels fuer alle Features', () => {
    for (const feature of CARE_CONSENT_FEATURES) {
      expect(CARE_CONSENT_LABELS[feature]).toBeDefined();
      expect(typeof CARE_CONSENT_LABELS[feature]).toBe('string');
    }
  });

  it('hat Beschreibungen fuer alle Features', () => {
    for (const feature of CARE_CONSENT_FEATURES) {
      expect(CARE_CONSENT_DESCRIPTIONS[feature]).toBeDefined();
      expect(typeof CARE_CONSENT_DESCRIPTIONS[feature]).toBe('string');
    }
  });
});
