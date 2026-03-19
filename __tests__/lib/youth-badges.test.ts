// __tests__/lib/youth-badges.test.ts
import { describe, it, expect } from 'vitest';
import { checkBadgeEligibility } from '@/lib/youth/badges';

describe('Youth Badges', () => {
  it('erkennt task_count Badge-Berechtigung', () => {
    const badge = { condition_type: 'task_count', condition_value: { count: 1 } };
    const stats = { total_tasks: 1, category_counts: {}, total_points: 20 };
    expect(checkBadgeEligibility(badge, stats)).toBe(true);
  });

  it('erkennt category_count Badge-Berechtigung', () => {
    const badge = { condition_type: 'category_count', condition_value: { category: 'technik', count: 5 } };
    const stats = { total_tasks: 10, category_counts: { technik: 5 }, total_points: 200 };
    expect(checkBadgeEligibility(badge, stats)).toBe(true);
  });

  it('lehnt ab wenn Bedingung nicht erfuellt', () => {
    const badge = { condition_type: 'task_count', condition_value: { count: 25 } };
    const stats = { total_tasks: 10, category_counts: {}, total_points: 100 };
    expect(checkBadgeEligibility(badge, stats)).toBe(false);
  });

  it('erkennt points_total Badge-Berechtigung', () => {
    const badge = { condition_type: 'points_total', condition_value: { points: 1000 } };
    const stats = { total_tasks: 100, category_counts: {}, total_points: 1200 };
    expect(checkBadgeEligibility(badge, stats)).toBe(true);
  });

  it('manual Badges koennen nicht automatisch verdient werden', () => {
    const badge = { condition_type: 'manual', condition_value: {} };
    const stats = { total_tasks: 999, category_counts: {}, total_points: 99999 };
    expect(checkBadgeEligibility(badge, stats)).toBe(false);
  });
});
