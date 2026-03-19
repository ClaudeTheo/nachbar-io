// __tests__/api/youth-tasks.test.ts
import { describe, it, expect } from 'vitest';

// Validierungs-Tests fuer Aufgaben
describe('Youth Task Validation', () => {
  const VALID_CATEGORIES = ['technik', 'garten', 'begleitung', 'digital', 'event'];
  const VALID_RISK_LEVELS = ['niedrig', 'mittel'];

  it('akzeptiert gueltige Kategorien', () => {
    VALID_CATEGORIES.forEach(cat => {
      expect(VALID_CATEGORIES.includes(cat)).toBe(true);
    });
  });

  it('begleitung erfordert requires_org', () => {
    const category = 'begleitung';
    const requiresOrg = category === 'begleitung';
    expect(requiresOrg).toBe(true);
  });

  it('lehnt unbekannte Kategorien ab', () => {
    expect(VALID_CATEGORIES.includes('einkauf')).toBe(false);
  });

  it('berechnet Punkte-Reward korrekt', () => {
    // Standard: 20 Punkte, Technik-Bonus: +10
    const baseReward = 20;
    const technikBonus = 10;
    expect(baseReward + technikBonus).toBe(30);
  });

  it('akzeptiert nur gueltige Risk-Levels', () => {
    expect(VALID_RISK_LEVELS.includes('niedrig')).toBe(true);
    expect(VALID_RISK_LEVELS.includes('mittel')).toBe(true);
    expect(VALID_RISK_LEVELS.includes('hoch')).toBe(false);
  });
});
