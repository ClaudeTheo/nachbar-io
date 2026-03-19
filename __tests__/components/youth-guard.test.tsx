// __tests__/components/youth-guard.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { YouthGuard } from '@/components/youth/YouthGuard';

// Mock des Hooks
vi.mock('@/lib/youth/hooks', () => ({
  useYouthProfile: vi.fn(),
}));

import { useYouthProfile } from '@/lib/youth/hooks';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('YouthGuard', () => {
  it('rendert children wenn access_level ausreicht', () => {
    vi.mocked(useYouthProfile).mockReturnValue({
      profile: { access_level: 'erweitert' } as ReturnType<typeof useYouthProfile>['profile'],
      loading: false,
    });

    render(
      <YouthGuard minLevel="erweitert">
        <div>Geschuetzter Inhalt</div>
      </YouthGuard>
    );

    expect(screen.getByText('Geschuetzter Inhalt')).toBeDefined();
  });

  it('rendert fallback wenn access_level nicht ausreicht', () => {
    vi.mocked(useYouthProfile).mockReturnValue({
      profile: { access_level: 'basis' } as ReturnType<typeof useYouthProfile>['profile'],
      loading: false,
    });

    render(
      <YouthGuard minLevel="erweitert" fallback={<div>Gesperrt</div>}>
        <div>Geschuetzter Inhalt</div>
      </YouthGuard>
    );

    expect(screen.queryByText('Geschuetzter Inhalt')).toBeNull();
    expect(screen.getByText('Gesperrt')).toBeDefined();
  });

  it('rendert nichts waehrend loading', () => {
    vi.mocked(useYouthProfile).mockReturnValue({
      profile: null,
      loading: true,
    });

    const { container } = render(
      <YouthGuard minLevel="basis">
        <div>Inhalt</div>
      </YouthGuard>
    );

    expect(container.innerHTML).toBe('');
  });

  it('rendert nichts wenn kein Youth-Profil', () => {
    vi.mocked(useYouthProfile).mockReturnValue({
      profile: null,
      loading: false,
    });

    const { container } = render(
      <YouthGuard minLevel="basis">
        <div>Inhalt</div>
      </YouthGuard>
    );

    expect(container.innerHTML).toBe('');
  });
});
