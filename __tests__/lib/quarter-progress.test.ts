import { describe, it, expect } from 'vitest';
import { MILESTONES } from '@/lib/quarter-progress';

describe('MILESTONES', () => {
  it('hat 6 Meilensteine', () => {
    expect(MILESTONES).toHaveLength(6);
  });

  it('beginnt bei 5 und endet bei 40', () => {
    expect(MILESTONES[0].threshold).toBe(5);
    expect(MILESTONES[MILESTONES.length - 1].threshold).toBe(40);
  });

  it('Schwellen sind aufsteigend sortiert', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].threshold).toBeGreaterThan(MILESTONES[i - 1].threshold);
    }
  });

  it('jeder Meilenstein hat message und emoji', () => {
    for (const m of MILESTONES) {
      expect(m.message).toBeTruthy();
      expect(m.emoji).toBeTruthy();
    }
  });
});
