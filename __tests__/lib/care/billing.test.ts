// __tests__/lib/care/billing.test.ts
// Abrechnungs- und Abo-Hilfsfunktionen

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/care/constants', () => ({
  PLAN_FEATURES: {
    free: ['alerts_receive', 'pinnwand_read', 'checkin', 'medical_emergency_sos'],
    plus: ['alerts_receive', 'pinnwand_read', 'checkin', 'medical_emergency_sos', 'marketplace', 'medications', 'appointments', 'reports'],
    pro: ['alerts_receive', 'pinnwand_read', 'checkin', 'medical_emergency_sos', 'marketplace', 'medications', 'appointments', 'reports', 'quarter_dashboard', 'moderation_tools'],
  },
}));

import { canUpgrade, isTrialExpired, trialDaysRemaining, getUpgradeFeatures, minimumPlanForFeature, PLAN_HIERARCHY } from '@/lib/care/billing';

describe('canUpgrade', () => {
  it('erlaubt Upgrade von free auf plus', () => {
    expect(canUpgrade('free', 'plus')).toBe(true);
  });

  it('erlaubt Upgrade von free auf pro', () => {
    expect(canUpgrade('free', 'pro')).toBe(true);
  });

  it('erlaubt Upgrade von plus auf pro', () => {
    expect(canUpgrade('plus', 'pro')).toBe(true);
  });

  it('verbietet Downgrade von plus auf free', () => {
    expect(canUpgrade('plus', 'free')).toBe(false);
  });

  it('verbietet gleichen Plan', () => {
    expect(canUpgrade('plus', 'plus')).toBe(false);
  });
});

describe('isTrialExpired', () => {
  it('gibt false fuer null zurueck', () => {
    expect(isTrialExpired(null)).toBe(false);
  });

  it('gibt true fuer vergangenes Datum zurueck', () => {
    expect(isTrialExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('gibt false fuer zukuenftiges Datum zurueck', () => {
    expect(isTrialExpired('2099-12-31T23:59:59Z')).toBe(false);
  });
});

describe('trialDaysRemaining', () => {
  it('gibt 0 fuer null zurueck', () => {
    expect(trialDaysRemaining(null)).toBe(0);
  });

  it('gibt 0 fuer vergangenes Datum zurueck', () => {
    expect(trialDaysRemaining('2020-01-01T00:00:00Z')).toBe(0);
  });

  it('gibt positive Tage fuer zukuenftiges Datum zurueck', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const days = trialDaysRemaining(futureDate);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});

describe('getUpgradeFeatures', () => {
  it('gibt neue Features bei Upgrade free → plus zurueck', () => {
    const features = getUpgradeFeatures('free', 'plus');
    expect(features).toContain('marketplace');
    expect(features).toContain('medications');
    expect(features).not.toContain('checkin'); // bereits in free
  });

  it('gibt neue Features bei Upgrade plus → pro zurueck', () => {
    const features = getUpgradeFeatures('plus', 'pro');
    expect(features).toContain('quarter_dashboard');
    expect(features).toContain('moderation_tools');
    expect(features).not.toContain('marketplace'); // bereits in plus
  });
});

describe('minimumPlanForFeature', () => {
  it('gibt free fuer checkin zurueck', () => {
    expect(minimumPlanForFeature('checkin')).toBe('free');
  });

  it('gibt plus fuer medications zurueck', () => {
    expect(minimumPlanForFeature('medications')).toBe('plus');
  });

  it('gibt pro fuer quarter_dashboard zurueck', () => {
    expect(minimumPlanForFeature('quarter_dashboard')).toBe('pro');
  });

  it('gibt null fuer unbekanntes Feature zurueck', () => {
    expect(minimumPlanForFeature('nonexistent_feature')).toBe(null);
  });
});

describe('PLAN_HIERARCHY', () => {
  it('hat korrekte Reihenfolge', () => {
    expect(PLAN_HIERARCHY).toEqual(['free', 'plus', 'pro']);
  });
});
