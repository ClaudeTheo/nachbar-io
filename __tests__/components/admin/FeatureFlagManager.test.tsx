// __tests__/components/admin/FeatureFlagManager.test.tsx
// Tests fuer die Feature-Flag Admin-Verwaltung

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';

// --- Mocks ---

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

// Supabase Client mocken
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// invalidateFlagCache mocken
const mockInvalidateCache = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  invalidateFlagCache: () => mockInvalidateCache(),
}));

// sonner Toast mocken
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- Testdaten ---

const MOCK_FLAGS = [
  {
    key: 'CARE_MODULE',
    enabled: true,
    required_roles: ['caregiver', 'org_admin'],
    required_plans: ['plus', 'pro_community'],
    enabled_quarters: [],
    admin_override: false,
  },
  {
    key: 'PILOT_MODE',
    enabled: false,
    required_roles: [],
    required_plans: [],
    enabled_quarters: [],
    admin_override: true,
  },
  {
    key: 'NINA_WARNINGS_ENABLED',
    enabled: false,
    required_roles: [],
    required_plans: [],
    enabled_quarters: [],
    admin_override: true,
  },
];

// Hilfsfunktion: Supabase-Chain fuer select aufbauen
function setupSelectChain(data: unknown[] | null, error: unknown = null) {
  mockOrder.mockResolvedValue({ data, error });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
}

// Hilfsfunktion: Supabase-Chain fuer update aufbauen
function setupUpdateChain(error: unknown = null) {
  mockEq.mockResolvedValue({ error });
  mockUpdate.mockReturnValue({ eq: mockEq });
}

// --- Tests ---

describe('FeatureFlagManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('zeigt Lade-Skeletons waehrend des Ladens', async () => {
    // Nie resolven, damit loading-State bestehen bleibt
    mockOrder.mockReturnValue(new Promise(() => {}));
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    // Dynamischer Import NACH dem Mock-Setup
    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    // Skeletons sollten sichtbar sein
    const skeletons = screen.getAllByTestId('flag-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('rendert Tabelle mit Flag-Daten', async () => {
    setupSelectChain(MOCK_FLAGS);

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(screen.getByTestId('flag-table')).toBeDefined();
    });

    // Flag-Keys sichtbar
    expect(screen.getByText('CARE_MODULE')).toBeDefined();
    expect(screen.getByText('PILOT_MODE')).toBeDefined();
    expect(screen.getByText('NINA_WARNINGS_ENABLED')).toBeDefined();

    // Ueberschrift
    expect(screen.getByText('Feature-Flags Verwaltung')).toBeDefined();
  });

  it('gruppiert externe API Flags unter "Externe APIs"', async () => {
    setupSelectChain(MOCK_FLAGS);

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(screen.getByText('Externe APIs')).toBeDefined();
    });

    const externalApisHeading = screen.getByRole('heading', {
      name: 'Externe APIs',
    });
    const externalApisSection = externalApisHeading.closest('section');

    expect(externalApisSection).not.toBeNull();
    expect(
      within(externalApisSection as HTMLElement).getByText('NINA_WARNINGS_ENABLED')
    ).toBeDefined();
    expect(
      within(externalApisSection as HTMLElement).getByText('Admin-Override')
    ).toBeDefined();
  });

  it('zeigt Rollen-Badges korrekt an', async () => {
    setupSelectChain(MOCK_FLAGS);

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(screen.getByTestId('flag-table')).toBeDefined();
    });

    // Rollen-Badges fuer CARE_MODULE
    expect(screen.getByText('caregiver')).toBeDefined();
    expect(screen.getByText('org_admin')).toBeDefined();
  });

  it('zeigt Plan-Badges korrekt an', async () => {
    setupSelectChain(MOCK_FLAGS);

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(screen.getByTestId('flag-table')).toBeDefined();
    });

    // Plan-Badges fuer CARE_MODULE
    expect(screen.getByText('plus')).toBeDefined();
    expect(screen.getByText('pro_community')).toBeDefined();
  });

  it('Toggle-Switch ruft Update auf und invalidiert Cache', async () => {
    setupSelectChain(MOCK_FLAGS);
    setupUpdateChain(null);

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(screen.getByTestId('flag-table')).toBeDefined();
    });

    // PILOT_MODE ist deaktiviert — Switch anklicken zum Aktivieren
    const pilotSwitch = screen.getByRole('switch', {
      name: 'PILOT_MODE aktivieren',
    });
    fireEvent.click(pilotSwitch);

    await waitFor(() => {
      // Supabase update wurde aufgerufen
      expect(mockUpdate).toHaveBeenCalledWith({ enabled: true });
      expect(mockEq).toHaveBeenCalledWith('key', 'PILOT_MODE');
    });

    // Cache wurde invalidiert
    expect(mockInvalidateCache).toHaveBeenCalled();

    // Erfolgs-Toast
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it('zeigt Fehler-Toast bei Ladefehler', async () => {
    setupSelectChain(null, { message: 'DB-Fehler' });

    const { FeatureFlagManager } = await import(
      '@/app/(app)/admin/components/FeatureFlagManager'
    );

    render(<FeatureFlagManager />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Feature-Flags konnten nicht geladen werden.'
      );
    });
  });
});
