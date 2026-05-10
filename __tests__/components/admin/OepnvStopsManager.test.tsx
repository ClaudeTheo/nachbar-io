// __tests__/components/admin/OepnvStopsManager.test.tsx
// Welle W11 — UI fuer OEPNV-Stops-Verwaltung (Discover + Apply pro Quartier).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { OepnvStopsManager } from '@/app/(app)/admin/components/OepnvStopsManager';

// --- Mocks ---

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- Helper ---

const QUARTERS = [
  { id: 'q-bs', name: 'Bad Saeckingen Pilot', city: 'Bad Saeckingen' },
  { id: 'q-other', name: 'Anderes Quartier', city: 'Beispielstadt' },
];

const STOPS = [
  {
    id: 'de:08336:6001',
    name: 'Bad Saeckingen Bahnhof',
    lat: 47.5535,
    lng: 7.964,
    type: 'stop',
    distanceMeters: 230,
  },
  {
    id: 'de:08336:6002',
    name: 'Schoepfle',
    lat: 47.553,
    lng: 7.96,
    type: 'stop',
    distanceMeters: 480,
  },
];

function mockFetchSequence(handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>) {
  let i = 0;
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const handler = handlers[i++];
    if (!handler) throw new Error(`Unmocked fetch ${i}: ${String(url)}`);
    const r = await handler(String(url), init);
    return r;
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Tests ---

describe('OepnvStopsManager', () => {
  it('laedt Quartiere und zeigt sie im Selector', async () => {
    mockFetchSequence([
      (url) => {
        expect(url).toMatch(/\/api\/admin\/quarters$/);
        return jsonResponse(QUARTERS);
      },
    ]);

    render(<OepnvStopsManager />);

    await waitFor(() => {
      expect(screen.getByText('Bad Saeckingen Pilot')).toBeTruthy();
    });
    expect(screen.getByText('Anderes Quartier')).toBeTruthy();
  });

  it('Discover-Klick laedt Stops und zeigt sie mit Checkboxen vorausgewaehlt', async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      (url) => {
        expect(url).toContain('/api/admin/quarters/q-bs/oepnv-stops/discover');
        return jsonResponse({
          quarterId: 'q-bs',
          quarterName: 'Bad Saeckingen Pilot',
          centerLat: 47.5535,
          centerLng: 7.964,
          stops: STOPS,
          fetchedAt: '2026-05-10T10:00:00Z',
          errors: [],
        });
      },
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => {
      expect(screen.getByText('Bad Saeckingen Pilot')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));

    await waitFor(() => {
      expect(screen.getByText('Bad Saeckingen Bahnhof')).toBeTruthy();
    });
    expect(screen.getByText('Schoepfle')).toBeTruthy();

    const cb1 = screen.getByLabelText(/Bad Saeckingen Bahnhof/) as HTMLInputElement;
    const cb2 = screen.getByLabelText(/Schoepfle/) as HTMLInputElement;
    expect(cb1.checked).toBe(true);
    expect(cb2.checked).toBe(true);
  });

  it('zeigt Distanz-Hinweis pro Stop', async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          quarterId: 'q-bs',
          quarterName: 'Bad Saeckingen Pilot',
          centerLat: 47.5535,
          centerLng: 7.964,
          stops: STOPS,
          fetchedAt: '2026-05-10T10:00:00Z',
          errors: [],
        }),
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));

    await waitFor(() => screen.getByText('Bad Saeckingen Bahnhof'));
    expect(screen.getByText(/230\s*m/)).toBeTruthy();
    expect(screen.getByText(/480\s*m/)).toBeTruthy();
  });

  it('Apply-Klick sendet POST mit ausgewaehlten Stops und zeigt Erfolg-Toast', async () => {
    let capturedBody: unknown = null;
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          quarterId: 'q-bs',
          quarterName: 'Bad Saeckingen Pilot',
          centerLat: 47.5535,
          centerLng: 7.964,
          stops: STOPS,
          fetchedAt: '2026-05-10T10:00:00Z',
          errors: [],
        }),
      (url, init) => {
        expect(url).toContain('/api/admin/quarters/q-bs/oepnv-stops');
        expect(init?.method).toBe('POST');
        capturedBody = JSON.parse(init?.body as string);
        return jsonResponse({ savedCount: 1 });
      },
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));
    await waitFor(() => screen.getByText('Bad Saeckingen Bahnhof'));

    // Zweite Checkbox abwaehlen
    fireEvent.click(screen.getByLabelText(/Schoepfle/));

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled();
    });
    expect(capturedBody).toEqual({
      stops: [{ id: 'de:08336:6001', name: 'Bad Saeckingen Bahnhof' }],
    });
    const successMsg = mockToastSuccess.mock.calls[0]?.[0];
    expect(String(successMsg)).toMatch(/1/);
  });

  it('Discover-Fehler zeigt Error-Toast', async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () => jsonResponse({ error: 'Quartier nicht gefunden' }, 500),
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('Apply-Fehler zeigt Error-Toast', async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          quarterId: 'q-bs',
          quarterName: 'Bad Saeckingen Pilot',
          centerLat: 47.5535,
          centerLng: 7.964,
          stops: STOPS,
          fetchedAt: '2026-05-10T10:00:00Z',
          errors: [],
        }),
      () => jsonResponse({ error: 'Schreibfehler' }, 500),
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByText('Bad Saeckingen Pilot'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));
    await waitFor(() => screen.getByText('Bad Saeckingen Bahnhof'));

    fireEvent.click(screen.getByRole('button', { name: /speichern/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('Discover mit errors[] zeigt Hinweis', async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          quarterId: 'q-other',
          quarterName: 'Anderes Quartier',
          centerLat: null,
          centerLng: null,
          stops: [],
          fetchedAt: '2026-05-10T10:00:00Z',
          errors: ['Quartier hat keine Center-Koordinaten'],
        }),
    ]);

    render(<OepnvStopsManager />);
    await waitFor(() => screen.getByText('Anderes Quartier'));
    fireEvent.click(screen.getByText('Anderes Quartier'));
    fireEvent.click(screen.getByRole('button', { name: /vorschlagen/i }));

    await waitFor(() => {
      expect(screen.getByText(/keine Center-Koordinaten/)).toBeTruthy();
    });
  });
});
