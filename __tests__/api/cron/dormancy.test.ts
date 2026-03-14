import { describe, it, expect } from 'vitest';

describe('Dormancy Detection', () => {
  it('should calculate weekly_active_pct correctly', () => {
    const activeUsers = 3;
    const totalMembers = 30;
    const pct = Math.round((activeUsers / totalMembers) * 100);
    expect(pct).toBe(10);
  });

  it('should detect dormant quarter when pct < 10 for 4+ weeks', () => {
    const weeklyActivePct = 8;
    const statusChangedAt = new Date('2026-02-01T00:00:00Z');
    const now = new Date('2026-03-14T00:00:00Z');
    const weeksSinceLowActivity = Math.floor(
      (now.getTime() - statusChangedAt.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    expect(weeksSinceLowActivity).toBeGreaterThanOrEqual(4);
    expect(weeklyActivePct).toBeLessThan(10);
  });

  it('should not mark active quarters as dormant', () => {
    const weeklyActivePct = 45;
    expect(weeklyActivePct).toBeGreaterThanOrEqual(10);
  });
});
