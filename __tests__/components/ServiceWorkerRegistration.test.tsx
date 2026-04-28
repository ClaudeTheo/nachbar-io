import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { cleanup } from '@testing-library/react';

// Mock UpdateBanner
vi.mock('@/components/UpdateBanner', () => ({
  UpdateBanner: ({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) => (
    <div data-testid="update-banner">
      <button onClick={onUpdate}>Update</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

const LAST_CHECK_KEY = 'pwa-last-update-check';

function createMockRegistration(waiting: ServiceWorker | null = null) {
  return {
    scope: '/',
    waiting,
    installing: null,
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    unregister: vi.fn().mockResolvedValue(true),
  };
}

function setupServiceWorkerMock(
  registration: ReturnType<typeof createMockRegistration>,
  registrations: ReturnType<typeof createMockRegistration>[] = [registration],
) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue(registration),
      getRegistrations: vi.fn().mockResolvedValue(registrations),
      controller: { state: 'activated' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    cleanup();
    vi.resetModules();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('deaktiviert vorhandene Service Worker ausserhalb von Production', async () => {
    const reg = createMockRegistration();
    setupServiceWorkerMock(reg);

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });

    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled();
    expect(reg.unregister).toHaveBeenCalled();
  });

  it('registriert den Service Worker', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const reg = createMockRegistration();
    setupServiceWorkerMock(reg);

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it('prueft auf Updates wenn letzter Check >24h her ist', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const reg = createMockRegistration();
    setupServiceWorkerMock(reg);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now() - 25 * 60 * 60 * 1000));

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });
    expect(reg.update).toHaveBeenCalled();
  });

  it('prueft NICHT auf Updates wenn letzter Check <24h her ist', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const reg = createMockRegistration();
    setupServiceWorkerMock(reg);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });
    expect(reg.update).not.toHaveBeenCalled();
  });

  it('zeigt Banner wenn bereits ein wartender SW vorhanden ist', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const waitingSw = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const reg = createMockRegistration(waitingSw);
    setupServiceWorkerMock(reg);

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
  });

  it('zeigt kein Banner ohne wartenden SW', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const reg = createMockRegistration();
    setupServiceWorkerMock(reg);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    const { ServiceWorkerRegistration } = await import('@/components/ServiceWorkerRegistration');
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });
    expect(screen.queryByTestId('update-banner')).not.toBeInTheDocument();
  });
});
