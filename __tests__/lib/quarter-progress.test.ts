import { describe, it, expect, vi } from 'vitest';
import { MILESTONES, getWeeklyDigest } from '@/lib/quarter-progress';

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

describe('getWeeklyDigest', () => {
  // Board-Posts und Hilfsangebote muessen aus help_requests kommen — eine
  // board_posts-Tabelle existiert in Prod nicht, Queries dagegen liefern immer 0.
  it('zaehlt Board-Posts und Hilfsangebote aus help_requests statt board_posts', async () => {
    const fromCalls: string[] = [];

    // Thenable-Chain: jede Query-Methode gibt sich selbst zurueck, await liefert result.
    const makeChain = (result: unknown) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'gte', 'gt', 'lt', 'order', 'limit', 'is']) {
        chain[m] = () => chain;
      }
      chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
      return chain;
    };

    const resultFor = (table: string) => {
      if (table === 'help_requests') return { count: 4 };
      if (table === 'events') return { count: 2 };
      if (table === 'household_members') return { count: 1 };
      return { count: 0 };
    };

    const mock = {
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        return makeChain(resultFor(table));
      }),
    };

    const digest = await getWeeklyDigest(mock as never, 'quarter-1');

    expect(fromCalls).not.toContain('board_posts');
    // Zwei getrennte help_requests-Zaehlungen: Board-Posts + Hilfsangebote.
    expect(fromCalls.filter((t) => t === 'help_requests')).toHaveLength(2);
    expect(digest.boardPosts).toBe(4);
    expect(digest.helpOffered).toBe(4);
    expect(digest.eventsCreated).toBe(2);
    expect(digest.newMembers).toBe(1);
  });
});
