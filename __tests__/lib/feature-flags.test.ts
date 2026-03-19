// __tests__/lib/feature-flags.test.ts
// Tests fuer das DB-getriebene Feature-Flag System

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkFeatureAccess,
  getFeatureFlags,
  invalidateFlagCache,
  type FeatureFlag,
  type UserContext,
} from '@/lib/feature-flags';

// --- Supabase Mock ---

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Hilfsfunktion: Mock-Flags setzen
function setMockFlags(flags: FeatureFlag[]) {
  mockSelect.mockResolvedValue({ data: flags, error: null });
}

function setMockError() {
  mockSelect.mockResolvedValue({ data: null, error: { message: 'DB-Fehler' } });
}

// Standard-Flag zum Wiederverwenden
const baseFlag: FeatureFlag = {
  key: 'TEST_FEATURE',
  enabled: true,
  required_roles: [],
  required_plans: [],
  enabled_quarters: [],
  admin_override: false,
};

const baseUser: UserContext = {
  role: 'user',
  plan: 'free',
  quarter_id: 'q-bad-saeckingen',
};

// --- Tests ---

describe('Feature-Flag System', () => {
  beforeEach(() => {
    // Cache vor jedem Test leeren
    invalidateFlagCache();
    vi.clearAllMocks();

    // PILOT_MODE standardmaessig aus
    delete process.env.NEXT_PUBLIC_PILOT_MODE;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PILOT_MODE;
  });

  describe('getFeatureFlags', () => {
    it('laedt Flags aus Supabase', async () => {
      setMockFlags([baseFlag]);

      const flags = await getFeatureFlags();

      expect(mockFrom).toHaveBeenCalledWith('feature_flags');
      expect(flags).toHaveLength(1);
      expect(flags[0].key).toBe('TEST_FEATURE');
    });

    it('gibt leeres Array bei DB-Fehler zurueck', async () => {
      setMockError();

      const flags = await getFeatureFlags();

      expect(flags).toEqual([]);
    });

    it('nutzt Cache bei erneutem Aufruf', async () => {
      setMockFlags([baseFlag]);

      await getFeatureFlags();
      await getFeatureFlags();

      // Nur ein DB-Aufruf wegen Cache
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkFeatureAccess', () => {
    it('gibt true zurueck wenn Flag aktiv und keine Einschraenkungen', async () => {
      setMockFlags([baseFlag]);

      const result = await checkFeatureAccess('TEST_FEATURE', baseUser);

      expect(result).toBe(true);
    });

    it('gibt false zurueck wenn Flag deaktiviert', async () => {
      setMockFlags([{ ...baseFlag, enabled: false }]);

      const result = await checkFeatureAccess('TEST_FEATURE', baseUser);

      expect(result).toBe(false);
    });

    it('gibt false zurueck wenn User-Rolle nicht in required_roles', async () => {
      setMockFlags([{ ...baseFlag, required_roles: ['admin', 'doctor'] }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, role: 'user' });

      expect(result).toBe(false);
    });

    it('gibt true zurueck wenn User-Rolle in required_roles enthalten', async () => {
      setMockFlags([{ ...baseFlag, required_roles: ['admin', 'user'] }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, role: 'user' });

      expect(result).toBe(true);
    });

    it('gibt false zurueck wenn User-Plan nicht in required_plans', async () => {
      setMockFlags([{ ...baseFlag, required_plans: ['plus', 'pro'] }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, plan: 'free' });

      expect(result).toBe(false);
    });

    it('gibt true zurueck wenn User-Plan in required_plans enthalten', async () => {
      setMockFlags([{ ...baseFlag, required_plans: ['plus', 'pro'] }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, plan: 'plus' });

      expect(result).toBe(true);
    });

    it('gibt true zurueck wenn PILOT_MODE aktiv (bypass Rollen/Plan)', async () => {
      process.env.NEXT_PUBLIC_PILOT_MODE = 'true';

      // Flag mit strengen Einschraenkungen
      setMockFlags([{
        ...baseFlag,
        required_roles: ['admin'],
        required_plans: ['pro'],
        enabled_quarters: ['q-other'],
      }]);

      const result = await checkFeatureAccess('TEST_FEATURE', baseUser);

      expect(result).toBe(true);
    });

    it('gibt true zurueck wenn admin_override fuer Admin-User', async () => {
      setMockFlags([{
        ...baseFlag,
        admin_override: true,
        required_roles: ['doctor'],
        required_plans: ['pro'],
      }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, role: 'admin' });

      expect(result).toBe(true);
    });

    it('gibt false zurueck wenn admin_override fuer Nicht-Admin', async () => {
      setMockFlags([{
        ...baseFlag,
        admin_override: true,
        required_roles: ['doctor'],
      }]);

      const result = await checkFeatureAccess('TEST_FEATURE', { ...baseUser, role: 'user' });

      expect(result).toBe(false);
    });

    it('gibt false zurueck wenn Flag-Key nicht gefunden', async () => {
      setMockFlags([baseFlag]);

      const result = await checkFeatureAccess('NONEXISTENT_FLAG', baseUser);

      expect(result).toBe(false);
    });

    it('prueft enabled_quarters korrekt', async () => {
      setMockFlags([{ ...baseFlag, enabled_quarters: ['q-bad-saeckingen'] }]);

      // User im richtigen Quartier
      const resultOk = await checkFeatureAccess('TEST_FEATURE', {
        ...baseUser,
        quarter_id: 'q-bad-saeckingen',
      });
      expect(resultOk).toBe(true);

      // Cache leeren fuer naechsten Test
      invalidateFlagCache();
      setMockFlags([{ ...baseFlag, enabled_quarters: ['q-bad-saeckingen'] }]);

      // User in anderem Quartier
      const resultFail = await checkFeatureAccess('TEST_FEATURE', {
        ...baseUser,
        quarter_id: 'q-other',
      });
      expect(resultFail).toBe(false);
    });

    it('gibt false zurueck wenn quarter_id fehlt aber enabled_quarters gesetzt', async () => {
      setMockFlags([{ ...baseFlag, enabled_quarters: ['q-bad-saeckingen'] }]);

      const result = await checkFeatureAccess('TEST_FEATURE', {
        role: 'user',
        plan: 'free',
        // quarter_id bewusst weggelassen
      });

      expect(result).toBe(false);
    });
  });

  describe('invalidateFlagCache', () => {
    it('leert den Cache und erzwingt neuen DB-Aufruf', async () => {
      setMockFlags([baseFlag]);

      // Erster Aufruf: DB wird abgefragt
      await getFeatureFlags();
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Zweiter Aufruf: Cache wird genutzt
      await getFeatureFlags();
      expect(mockSelect).toHaveBeenCalledTimes(1);

      // Cache leeren
      invalidateFlagCache();

      // Dritter Aufruf: DB wird erneut abgefragt
      await getFeatureFlags();
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });
  });
});
