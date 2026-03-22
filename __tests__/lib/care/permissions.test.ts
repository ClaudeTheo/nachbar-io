// __tests__/lib/care/permissions.test.ts
// Rollenbasierte Berechtigungspruefung

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/care/constants', () => ({
  hasFeature: vi.fn((plan: string, feature: string) => {
    if (plan === 'plus') return ['medications', 'appointments', 'checkin'].includes(feature);
    if (plan === 'free') return ['checkin', 'medical_emergency_sos'].includes(feature);
    return false;
  }),
}));

function createMockSupabase(options: {
  user?: { id: string } | null;
  isAdmin?: boolean;
  helperRole?: string | null;
  assignedSeniors?: string[];
  subscription?: { plan: string; status: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user ?? null } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'users') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: options.isAdmin ? { is_admin: true } : { is_admin: false },
              error: null,
            }),
          }),
        }),
      };
      if (table === 'care_helpers') {
        // getCareRole ruft care_helpers zweimal auf:
        // 1. select('role').eq('user_id').eq('verification_status').maybeSingle()
        // 2. select('assigned_seniors').eq('user_id').maybeSingle()
        const maybeSingleRole = vi.fn().mockResolvedValue({
          data: options.helperRole ? { role: options.helperRole } : null,
          error: null,
        });
        const maybeSingleAssigned = vi.fn().mockResolvedValue({
          data: options.helperRole ? { assigned_seniors: options.assignedSeniors ?? [] } : null,
          error: null,
        });
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle: maybeSingleRole }),
              maybeSingle: maybeSingleAssigned,
            }),
          }),
        };
      }
      if (table === 'care_subscriptions') return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: options.subscription ?? null,
              error: null,
            }),
          }),
        }),
      };
      return { select: vi.fn() };
    }),
  };
}

describe('getCareRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gibt none zurueck ohne authentifizierten User', async () => {
    const { getCareRole } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ user: null });
    const role = await getCareRole(supabase as any, 'senior-1');
    expect(role).toBe('none');
  });

  it('gibt senior zurueck wenn User gleich seniorId', async () => {
    const { getCareRole } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ user: { id: 'senior-1' } });
    const role = await getCareRole(supabase as any, 'senior-1');
    expect(role).toBe('senior');
  });

  it('gibt admin zurueck fuer Admin-User', async () => {
    const { getCareRole } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ user: { id: 'admin-1' }, isAdmin: true });
    const role = await getCareRole(supabase as any, 'senior-1');
    expect(role).toBe('admin');
  });

  it('gibt Helfer-Rolle zurueck fuer zugewiesenen Helfer', async () => {
    const { getCareRole } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({
      user: { id: 'helper-1' },
      isAdmin: false,
      helperRole: 'relative',
      assignedSeniors: ['senior-1'],
    });
    const role = await getCareRole(supabase as any, 'senior-1');
    expect(role).toBe('relative');
  });

  it('gibt none zurueck fuer nicht zugewiesenen Helfer', async () => {
    const { getCareRole } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({
      user: { id: 'helper-1' },
      isAdmin: false,
      helperRole: 'relative',
      assignedSeniors: ['other-senior'],
    });
    const role = await getCareRole(supabase as any, 'senior-1');
    expect(role).toBe('none');
  });
});

describe('canAccessFeature', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gibt immer true fuer medical_emergency_sos zurueck', async () => {
    const { canAccessFeature } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ subscription: null });
    const result = await canAccessFeature(supabase as any, 'senior-1', 'medical_emergency_sos');
    expect(result).toBe(true);
  });

  it('gibt true fuer Plus-Feature mit Plus-Abo zurueck', async () => {
    const { canAccessFeature } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ subscription: { plan: 'plus', status: 'active' } });
    const result = await canAccessFeature(supabase as any, 'senior-1', 'medications');
    expect(result).toBe(true);
  });

  it('gibt false fuer Plus-Feature mit Free-Plan zurueck', async () => {
    const { canAccessFeature } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ subscription: null });
    const result = await canAccessFeature(supabase as any, 'senior-1', 'medications');
    expect(result).toBe(false);
  });

  it('gibt false fuer inaktives Abo zurueck', async () => {
    const { canAccessFeature } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ subscription: { plan: 'plus', status: 'cancelled' } });
    const result = await canAccessFeature(supabase as any, 'senior-1', 'medications');
    expect(result).toBe(false);
  });

  it('gibt true fuer Trial-Abo zurueck', async () => {
    const { canAccessFeature } = await import('@/lib/care/permissions');
    const supabase = createMockSupabase({ subscription: { plan: 'plus', status: 'trial' } });
    const result = await canAccessFeature(supabase as any, 'senior-1', 'medications');
    expect(result).toBe(true);
  });
});
