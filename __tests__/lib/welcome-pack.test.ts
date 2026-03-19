import { describe, it, expect, vi } from 'vitest';
import { hasReceivedWelcomePack } from '@/lib/welcome-pack';

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
