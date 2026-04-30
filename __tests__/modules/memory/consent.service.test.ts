import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

import {
  hasConsent,
  revokeConsent,
} from '@/modules/memory/services/consent.service';

describe('Memory Consent Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasConsent', () => {
    it('gibt true zurueck wenn Consent granted', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { granted: true, revoked_at: null },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await hasConsent(mockSupabase as unknown as SupabaseClient, 'user-1', 'memory_basis');
      expect(result).toBe(true);
    });

    it('gibt false zurueck wenn kein Consent', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await hasConsent(mockSupabase as unknown as SupabaseClient, 'user-1', 'memory_basis');
      expect(result).toBe(false);
    });

    it('gibt false zurueck wenn revoked', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { granted: false, revoked_at: '2026-03-31' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await hasConsent(mockSupabase as unknown as SupabaseClient, 'user-1', 'memory_basis');
      expect(result).toBe(false);
    });
  });

  describe('revokeConsent', () => {
    it('loescht alle Fakten der Kategorie bei Widerruf', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_memory_consents') {
          return { upsert: mockUpsert };
        }
        if (table === 'user_memory_facts') {
          return { delete: mockDelete };
        }
        if (table === 'user_memory_audit_log') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      await revokeConsent(mockSupabase as unknown as SupabaseClient, {
        userId: 'user-1',
        consentType: 'memory_care',
        actorUserId: 'user-1',
        actorRole: 'senior',
      });

      // Pruefe dass Fakten geloescht werden
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
