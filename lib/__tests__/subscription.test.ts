// lib/__tests__/subscription.test.ts
// Tests fuer Trial-Ablauf und Auto-Downgrade Logik
import { describe, it, expect, vi } from 'vitest';
import {
  TRIAL_DURATION_DAYS,
  WARNING_DAYS_BEFORE,
  checkTrialExpiry,
  downgradeToFree,
} from '../subscription';

// Mock-Supabase-Client erstellen
function createMockSupabase(responses: Record<string, unknown> = {}) {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({ error: null }),
    }),
  });

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: responses.expired ?? [],
          error: null,
        }),
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: responses.warned ?? [],
            error: null,
          }),
        }),
      }),
    }),
    update: mockUpdate,
  });

  return {
    from: mockFrom,
    _mockFrom: mockFrom,
    _mockUpdate: mockUpdate,
  };
}

describe('Subscription-Konstanten', () => {
  it('TRIAL_DURATION_DAYS ist 14', () => {
    expect(TRIAL_DURATION_DAYS).toBe(14);
  });

  it('WARNING_DAYS_BEFORE ist 3', () => {
    expect(WARNING_DAYS_BEFORE).toBe(3);
  });

  it('WARNING_DAYS_BEFORE ist kleiner als TRIAL_DURATION_DAYS', () => {
    expect(WARNING_DAYS_BEFORE).toBeLessThan(TRIAL_DURATION_DAYS);
  });
});

describe('checkTrialExpiry', () => {
  it('gibt leere Arrays zurueck wenn keine Trials ablaufen', async () => {
    const supabase = createMockSupabase({ expired: [], warned: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTrialExpiry(supabase as any);
    expect(result.expired).toEqual([]);
    expect(result.warned).toEqual([]);
  });

  it('gibt abgelaufene User-IDs zurueck', async () => {
    const supabase = createMockSupabase({
      expired: [{ user_id: 'user-1' }, { user_id: 'user-2' }],
      warned: [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTrialExpiry(supabase as any);
    expect(result.expired).toEqual(['user-1', 'user-2']);
    expect(result.warned).toEqual([]);
  });

  it('gibt gewarnten User-IDs zurueck', async () => {
    const supabase = createMockSupabase({
      expired: [],
      warned: [{ user_id: 'user-3' }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTrialExpiry(supabase as any);
    expect(result.expired).toEqual([]);
    expect(result.warned).toEqual(['user-3']);
  });

  it('kann gleichzeitig expired und warned zurueckgeben', async () => {
    const supabase = createMockSupabase({
      expired: [{ user_id: 'user-1' }],
      warned: [{ user_id: 'user-2' }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await checkTrialExpiry(supabase as any);
    expect(result.expired).toHaveLength(1);
    expect(result.warned).toHaveLength(1);
  });
});

describe('downgradeToFree', () => {
  it('aktualisiert users-Tabelle mit role=user', async () => {
    const updateEq = vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({ error: null }),
    });
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

    const supabase = {
      from: vi.fn().mockReturnValue({
        update: updateFn,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downgradeToFree(supabase as any, 'user-abc');

    // Erster Aufruf: users-Tabelle
    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(updateFn).toHaveBeenCalledWith({ role: 'user' });
    expect(updateEq).toHaveBeenCalledWith('id', 'user-abc');
  });

  it('aktualisiert care_subscriptions auf expired/free', async () => {
    const tables: string[] = [];
    const updates: unknown[] = [];

    const updateEq = vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({ error: null }),
    });
    const updateFn = vi.fn().mockImplementation((data: unknown) => {
      updates.push(data);
      return { eq: updateEq };
    });

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        tables.push(table);
        return { update: updateFn };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downgradeToFree(supabase as any, 'user-xyz');

    // Zweiter Aufruf: care_subscriptions
    expect(tables).toContain('care_subscriptions');
    expect(updates).toContainEqual({ status: 'expired', plan: 'free' });
  });

  it('deaktiviert heartbeat_visible in caregiver_links', async () => {
    const tables: string[] = [];
    const updates: unknown[] = [];

    const isFn = vi.fn().mockResolvedValue({ error: null });
    const updateEq = vi.fn().mockReturnValue({ is: isFn });
    const updateFn = vi.fn().mockImplementation((data: unknown) => {
      updates.push(data);
      return { eq: updateEq };
    });

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        tables.push(table);
        return { update: updateFn };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await downgradeToFree(supabase as any, 'user-123');

    // Dritter Aufruf: caregiver_links
    expect(tables).toContain('caregiver_links');
    expect(updates).toContainEqual({ heartbeat_visible: false });

    // Pruefen dass revoked_at IS NULL gefiltert wird
    expect(isFn).toHaveBeenCalledWith('revoked_at', null);
  });

  it('wirft bei users-Update-Fehler', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB-Fehler' } }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(downgradeToFree(supabase as any, 'user-err'))
      .rejects.toEqual({ message: 'DB-Fehler' });
  });
});
