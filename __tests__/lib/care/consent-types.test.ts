import { describe, expect, it } from 'vitest';
import { CARE_CONSENT_FEATURES, CARE_CONSENT_LABELS, CARE_CONSENT_DESCRIPTIONS } from '@/lib/care/constants';

describe('Care Consent Constants', () => {
  it('definiert 5 Consent-Features', () => {
    expect(CARE_CONSENT_FEATURES).toHaveLength(5);
    expect(CARE_CONSENT_FEATURES).toContain('sos');
    expect(CARE_CONSENT_FEATURES).toContain('checkin');
    expect(CARE_CONSENT_FEATURES).toContain('medications');
    expect(CARE_CONSENT_FEATURES).toContain('care_profile');
    expect(CARE_CONSENT_FEATURES).toContain('emergency_contacts');
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
