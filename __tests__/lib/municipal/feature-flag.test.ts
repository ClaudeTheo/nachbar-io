// __tests__/lib/municipal/feature-flag.test.ts
// Tests fuer KOMMUNAL_MODULE Feature-Flag Integration

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSelect = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('KOMMUNAL_MODULE Feature-Flag', () => {
  it('checkFeatureAccess gibt true wenn Flag aktiv und PILOT_MODE', async () => {
    vi.stubEnv('NEXT_PUBLIC_PILOT_MODE', 'true');

    mockSelect.mockResolvedValue({
      data: [
        {
          key: 'KOMMUNAL_MODULE',
          enabled: true,
          required_roles: [],
          required_plans: [],
          enabled_quarters: [],
          admin_override: true,
        },
      ],
      error: null,
    });

    // Cache invalidieren damit frische Daten geladen werden
    const { invalidateFlagCache, checkFeatureAccess } = await import('@/lib/feature-flags');
    invalidateFlagCache();

    const result = await checkFeatureAccess('KOMMUNAL_MODULE', {
      role: 'resident',
      plan: 'free',
      quarter_id: 'q1',
    });

    expect(result).toBe(true);
  });

  it('checkFeatureAccess gibt false wenn Flag deaktiviert', async () => {
    vi.stubEnv('NEXT_PUBLIC_PILOT_MODE', 'false');

    mockSelect.mockResolvedValue({
      data: [
        {
          key: 'KOMMUNAL_MODULE',
          enabled: false,
          required_roles: [],
          required_plans: [],
          enabled_quarters: [],
          admin_override: true,
        },
      ],
      error: null,
    });

    const { invalidateFlagCache, checkFeatureAccess } = await import('@/lib/feature-flags');
    invalidateFlagCache();

    const result = await checkFeatureAccess('KOMMUNAL_MODULE', {
      role: 'resident',
      plan: 'free',
    });

    expect(result).toBe(false);
  });

  it('checkFeatureAccess gibt false wenn Flag nicht existiert', async () => {
    vi.stubEnv('NEXT_PUBLIC_PILOT_MODE', 'false');

    mockSelect.mockResolvedValue({
      data: [],
      error: null,
    });

    const { invalidateFlagCache, checkFeatureAccess } = await import('@/lib/feature-flags');
    invalidateFlagCache();

    const result = await checkFeatureAccess('NONEXISTENT_FLAG', {
      role: 'resident',
      plan: 'free',
    });

    expect(result).toBe(false);
  });

  it('checkFeatureAccess gibt true fuer Admin mit admin_override', async () => {
    vi.stubEnv('NEXT_PUBLIC_PILOT_MODE', 'false');

    mockSelect.mockResolvedValue({
      data: [
        {
          key: 'KOMMUNAL_MODULE',
          enabled: true,
          required_roles: ['org_admin'],
          required_plans: ['pro_community'],
          enabled_quarters: [],
          admin_override: true,
        },
      ],
      error: null,
    });

    const { invalidateFlagCache, checkFeatureAccess } = await import('@/lib/feature-flags');
    invalidateFlagCache();

    const result = await checkFeatureAccess('KOMMUNAL_MODULE', {
      role: 'admin',
      plan: 'free',
    });

    expect(result).toBe(true);
  });
});
