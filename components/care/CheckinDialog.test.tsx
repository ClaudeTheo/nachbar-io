// components/care/CheckinDialog.test.tsx
// Nachbar.io — Tests fuer Check-in-Dialog (Stimmungserfassung + API)

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { CheckinDialog } from './CheckinDialog';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CheckinDialog', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'ci-1', status: 'ok' }),
    });
    globalThis.fetch = mockFetch as typeof fetch;
  });

  it('zeigt "Wie geht es Ihnen?" Ueberschrift', () => {
    render(<CheckinDialog />);
    expect(screen.getByText('Wie geht es Ihnen?')).toBeInTheDocument();
  });

  it('zeigt alle 3 Stimmungsoptionen', () => {
    render(<CheckinDialog />);
    expect(screen.getByText('Mir geht es gut')).toBeInTheDocument();
    expect(screen.getByText('Nicht so gut')).toBeInTheDocument();
    expect(screen.getByText('Brauche Hilfe')).toBeInTheDocument();
  });

  it('zeigt optionales Notiz-Feld', () => {
    render(<CheckinDialog />);
    expect(screen.getByLabelText(/hinzufuegen/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Kopfschmerzen/)).toBeInTheDocument();
  });

  it('sendet Check-in mit status "ok" und mood "good"', async () => {
    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('ok');
      expect(body.mood).toBe('good');
    });
  });

  it('sendet Check-in mit status "not_well" und mood "neutral"', async () => {
    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Nicht so gut'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('not_well');
      expect(body.mood).toBe('neutral');
    });
  });

  it('sendet Check-in mit status "need_help" und mood "bad"', async () => {
    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Brauche Hilfe'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.status).toBe('need_help');
      expect(body.mood).toBe('bad');
    });
  });

  it('sendet Notiz im Request', async () => {
    render(<CheckinDialog />);

    const textarea = screen.getByPlaceholderText(/Kopfschmerzen/);
    fireEvent.change(textarea, { target: { value: 'Rueckenschmerzen seit gestern' } });
    fireEvent.click(screen.getByText('Nicht so gut'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.note).toBe('Rueckenschmerzen seit gestern');
    });
  });

  it('sendet KEINE Notiz wenn leer', async () => {
    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.note).toBeUndefined();
    });
  });

  it('zeigt Erfolgs-Screen nach erfolgreichem Check-in', async () => {
    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      expect(screen.getByText('Danke!')).toBeInTheDocument();
      expect(screen.getByText(/Check-in wurde gespeichert/)).toBeInTheDocument();
    });
  });

  it('ruft onComplete Callback auf', async () => {
    const onComplete = vi.fn();
    render(<CheckinDialog onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('navigiert zu /confirmed bei device source', async () => {
    render(<CheckinDialog source="device" />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/confirmed');
    });
  });

  it('zeigt Fehler bei fehlgeschlagenem API-Aufruf', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Status ungueltig' }),
    });

    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      expect(screen.getByText('Status ungueltig')).toBeInTheDocument();
    });
  });

  it('zeigt Verbindungsfehler bei Netzwerkproblem', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CheckinDialog />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument();
    });
  });

  it('Stimmungs-Buttons haben minHeight 80px (Senior Touch-Target)', () => {
    render(<CheckinDialog />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.style.minHeight).toBe('80px');
    });
  });

  it('Stimmungs-Buttons haben touchAction: manipulation', () => {
    render(<CheckinDialog />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.style.touchAction).toBe('manipulation');
    });
  });

  it('sendet scheduled_at wenn angegeben', async () => {
    render(<CheckinDialog scheduledAt="2026-03-12T08:00:00Z" />);
    fireEvent.click(screen.getByText('Mir geht es gut'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.scheduled_at).toBe('2026-03-12T08:00:00Z');
    });
  });
});
