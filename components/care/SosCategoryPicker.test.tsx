// components/care/SosCategoryPicker.test.tsx
// Nachbar.io — Tests fuer SOS-Kategorie-Auswahl
// KRITISCH: EmergencyBanner muss bei Notfall-Kategorien erscheinen (FMEA FM-NB-02)

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SosCategoryPicker } from './SosCategoryPicker';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('lucide-react', () => ({
  Phone: (props: Record<string, unknown>) => <svg data-testid="phone-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SosCategoryPicker', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'alert-1' }),
    });
    globalThis.fetch = mockFetch as typeof fetch;
  });

  it('zeigt "Was brauchen Sie?" Ueberschrift', () => {
    render(<SosCategoryPicker />);
    expect(screen.getByText('Was brauchen Sie?')).toBeInTheDocument();
  });

  it('rendert alle 5 Kategorien', () => {
    render(<SosCategoryPicker />);
    expect(screen.getByText('Dringende Hilfe benötigt')).toBeInTheDocument();
    expect(screen.getByText('Allgemeine Hilfe')).toBeInTheDocument();
    expect(screen.getByText('Besuch gewuenscht')).toBeInTheDocument();
    expect(screen.getByText('Einkauf / Besorgung')).toBeInTheDocument();
    expect(screen.getByText('Erinnerungshilfe')).toBeInTheDocument();
  });

  it('zeigt EmergencyBanner bei Klick auf "Dringende Hilfe benötigt" (FMEA FM-NB-02)', () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Dringende Hilfe benötigt'));

    // EmergencyBanner muss "Wichtiger Hinweis" zeigen
    expect(screen.getByText('Wichtiger Hinweis')).toBeInTheDocument();
  });

  it('zeigt 112 und 110 Nummern im EmergencyBanner', () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Dringende Hilfe benötigt'));

    // 112/110 koennen mehrfach vorkommen (Link + Text)
    const elements112 = screen.getAllByText(/112/);
    expect(elements112.length).toBeGreaterThan(0);
    const elements110 = screen.getAllByText(/110/);
    expect(elements110.length).toBeGreaterThan(0);
  });

  it('zeigt KEINEN EmergencyBanner bei Klick auf "Allgemeine Hilfe"', async () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    // Kein Banner, stattdessen wird fetch aufgerufen
    expect(screen.queryByText('Wichtiger Hinweis')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('sendet API-Anfrage bei Nicht-Notfall-Kategorie', async () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Besuch gewuenscht'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/sos', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"category":"visit_wanted"'),
      }));
    });
  });

  it('sendet source im API-Request', async () => {
    render(<SosCategoryPicker source="device" />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.source).toBe('device');
    });
  });

  it('navigiert nach erfolgreichem SOS-Alert', async () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/care/sos/alert-1');
    });
  });

  it('ruft onSosCreated Callback statt Navigation', async () => {
    const onSosCreated = vi.fn();
    render(<SosCategoryPicker onSosCreated={onSosCreated} />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    await waitFor(() => {
      expect(onSosCreated).toHaveBeenCalledWith('alert-1');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('zeigt Fehler bei fehlgeschlagenem API-Aufruf', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Feature nicht verfuegbar' }),
    });

    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    await waitFor(() => {
      expect(screen.getByText('Feature nicht verfuegbar')).toBeInTheDocument();
    });
  });

  it('zeigt Verbindungsfehler bei Netzwerkproblem', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    await waitFor(() => {
      expect(screen.getByText(/Verbindungsfehler/)).toBeInTheDocument();
    });
  });

  it('Kategorie-Buttons haben minHeight 80px (Senior Touch-Target)', () => {
    render(<SosCategoryPicker />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.style.minHeight).toBe('80px');
    });
  });

  it('Kategorie-Buttons haben touchAction: manipulation', () => {
    render(<SosCategoryPicker />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.style.touchAction).toBe('manipulation');
    });
  });
});
