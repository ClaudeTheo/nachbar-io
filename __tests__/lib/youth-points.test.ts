// __tests__/lib/youth-points.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTaskReward } from '@/modules/youth';

describe('Youth Points', () => {
  it('gibt Standard-Belohnung fuer normale Aufgabe', () => {
    expect(calculateTaskReward('garten', 30)).toBe(20);
  });

  it('gibt Technik-Bonus', () => {
    expect(calculateTaskReward('technik', 30)).toBe(30);
  });

  it('skaliert mit geschaetzter Dauer', () => {
    expect(calculateTaskReward('digital', 60)).toBe(40); // Basis 20 + Dauer-Bonus 20
    expect(calculateTaskReward('digital', 120)).toBe(80); // Basis 20 + 3 Blocks * 20
  });

  it('begrenzt Maximum auf 200', () => {
    expect(calculateTaskReward('technik', 480)).toBeLessThanOrEqual(200);
  });
});
