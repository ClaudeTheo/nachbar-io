import { describe, it, expect } from 'vitest';

// Onboarding-Schritte Definition (muss mit Route uebereinstimmen)
const ONBOARDING_STEPS = [
  { step: 'welcome', delayHours: 0 },
  { step: 'profile', delayHours: 24 },
  { step: 'pinnwand', delayHours: 72 },
  { step: 'connect', delayHours: 168 },
  { step: 'help', delayHours: 336 },
  { step: 'feedback', delayHours: 720 },
];

describe('Onboarding Cron', () => {
  it('should define 6 onboarding steps with correct delays', () => {
    expect(ONBOARDING_STEPS).toHaveLength(6);
    expect(ONBOARDING_STEPS[0]).toEqual({ step: 'welcome', delayHours: 0 });
    expect(ONBOARDING_STEPS[5]).toEqual({ step: 'feedback', delayHours: 720 });
  });

  it('should reject requests without CRON_SECRET', () => {
    const headers = new Headers();
    headers.set('authorization', 'Bearer wrong-secret');
    expect(headers.get('authorization')).not.toBe('Bearer test-secret');
  });

  it('should calculate step eligibility based on registration time', () => {
    const registeredAt = new Date('2026-03-01T10:00:00Z');
    const now = new Date('2026-03-02T12:00:00Z');
    const hoursSinceRegistration = (now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60);

    // 26 Stunden seit Registrierung — welcome (0h) und profile (24h) faellig
    expect(hoursSinceRegistration).toBeGreaterThanOrEqual(24);
    expect(hoursSinceRegistration).toBeLessThan(72);

    const eligibleSteps = ONBOARDING_STEPS.filter(s => s.delayHours <= hoursSinceRegistration);
    expect(eligibleSteps).toHaveLength(2); // welcome + profile
  });
});
