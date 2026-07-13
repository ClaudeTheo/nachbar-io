import { describe, it, expect, vi } from 'vitest';
import { hasReceivedWelcomePack, sendWelcomePack } from '@/lib/welcome-pack';

describe('hasReceivedWelcomePack', () => {
  it('gibt false zurueck wenn kein Willkommenspaket existiert', async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
      }),
    };
    const result = await hasReceivedWelcomePack(mock as never, 'user-1');
    expect(result).toBe(false);
  });

  it('gibt true zurueck wenn Willkommenspaket bereits gesendet', async () => {
    const mock = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }),
        }),
      }),
    };
    const result = await hasReceivedWelcomePack(mock as never, 'user-1');
    expect(result).toBe(true);
  });
});

describe('sendWelcomePack', () => {
  // Schwarzes Brett liegt in help_requests (category='board'), NICHT in einer
  // eigenen board_posts-Tabelle (existiert nicht). Der Willkommens-Post muss
  // daher schema-korrekt in help_requests landen.
  it('legt den Willkommens-Post schema-korrekt in help_requests an (nicht board_posts)', async () => {
    const fromCalls: string[] = [];
    const inserts: Array<{ table: string; payload: Record<string, unknown> }> = [];

    const makeBuilder = (table: string) => ({
      select: () => ({
        eq: () => ({
          // hasReceivedWelcomePack: from('notifications').select().eq().eq() -> count
          eq: () => Promise.resolve({ count: 0 }),
          // Events-Query: select().eq().gte().order().limit()
          gte: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }),
        }),
      }),
      insert: (payload: Record<string, unknown>) => {
        inserts.push({ table, payload });
        return Promise.resolve({ error: null });
      },
    });

    const mock = {
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        return makeBuilder(table);
      }),
    };

    const result = await sendWelcomePack(mock as never, 'user-1', 'quarter-1', 'Anna');

    expect(result.sent).toBe(true);
    expect(fromCalls).toContain('help_requests');
    expect(fromCalls).not.toContain('board_posts');

    const boardInsert = inserts.find((i) => i.table === 'help_requests');
    expect(boardInsert).toBeDefined();
    expect(boardInsert!.payload).toMatchObject({
      user_id: 'user-1',
      quarter_id: 'quarter-1',
      type: 'offer',
      category: 'board',
      description: null,
      status: 'active',
    });
    // Board-Text liegt im NOT-NULL-Feld title, nicht in einem content-Feld.
    expect(typeof boardInsert!.payload.title).toBe('string');
    expect(boardInsert!.payload.title).toContain('Anna');
    expect(boardInsert!.payload).not.toHaveProperty('content');
  });
});
