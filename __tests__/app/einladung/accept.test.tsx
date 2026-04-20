import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/einladung/tok-abc/accept',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ token: 'tok-abc' }),
}));

import EinladungAcceptPage from '@/app/einladung/[token]/accept/page';

describe('EinladungAcceptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('ruft POST /api/housing/invitations/consume mit Token auf', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ civicOrgId: 'civic-org-1', householdId: 'hh-1' }),
    });

    render(<EinladungAcceptPage params={Promise.resolve({ token: 'tok-abc' })} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/housing/invitations/consume',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'tok-abc' }),
        }),
      );
    });
  });

  it('zeigt Erfolgsmeldung bei 200', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ civicOrgId: 'civic-org-1', householdId: 'hh-1' }),
    });

    render(<EinladungAcceptPage params={Promise.resolve({ token: 'tok-abc' })} />);

    await waitFor(() => {
      expect(screen.getByText(/Einladung erfolgreich angenommen|verbunden/i)).toBeTruthy();
    });
  });

  it('leitet zu Login bei 401 (mit next-Parameter)', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Nicht autorisiert' }),
    });

    render(<EinladungAcceptPage params={Promise.resolve({ token: 'tok-abc' })} />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/login\?next=/),
      );
    });
    // next-Parameter zeigt zurueck auf die accept-Seite
    const call = pushMock.mock.calls[0][0] as string;
    expect(decodeURIComponent(call)).toContain('/einladung/tok-abc/accept');
  });

  it('zeigt Fehlermeldung bei 404', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Einladung nicht gefunden oder abgelaufen' }),
    });

    render(<EinladungAcceptPage params={Promise.resolve({ token: 'tok-abc' })} />);

    await waitFor(() => {
      expect(screen.getByText(/nicht gefunden|abgelaufen/i)).toBeTruthy();
    });
    // KEIN Login-Redirect bei 404
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('zeigt generische Fehlermeldung bei sonstigen Fehlern', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Interner Fehler' }),
    });

    render(<EinladungAcceptPage params={Promise.resolve({ token: 'tok-abc' })} />);

    await waitFor(() => {
      expect(screen.getByText(/Interner Fehler|fehlgeschlagen/i)).toBeTruthy();
    });
  });
});
