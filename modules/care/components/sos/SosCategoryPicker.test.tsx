// components/care/SosCategoryPicker.test.tsx
// Nachbar.io — Tests für SOS-Kategorie-Auswahl
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

  // W8 (A3:4): Nicht-Notfall-Kategorien feuern nicht mehr beim ersten Tap —
  // erst Kategorie waehlen, dann bewusst bestaetigen (2 Taps, Fehlalarm-Schutz).
  function chooseAndConfirm(label: string) {
    fireEvent.click(screen.getByText(label));
    fireEvent.click(screen.getByRole('button', { name: /Ja, Hilfe anfragen/i }));
  }

  it('zeigt "Was brauchen Sie?" Überschrift', () => {
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

    // 112/110 können mehrfach vorkommen (Link + Text)
    const elements112 = screen.getAllByText(/112/);
    expect(elements112.length).toBeGreaterThan(0);
    const elements110 = screen.getAllByText(/110/);
    expect(elements110.length).toBeGreaterThan(0);
  });

  it('zeigt KEINEN EmergencyBanner, sondern eine Bestaetigung bei Klick auf "Allgemeine Hilfe" (W8, A3:4)', () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));

    // Kein Banner, KEIN sofortiger Alarm — erst die Bestaetigungsansicht
    expect(screen.queryByText('Wichtiger Hinweis')).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Ja, Hilfe anfragen/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abbrechen/i })).toBeInTheDocument();
    // Ansichtswechsel muss fuer Screenreader hoerbar sein (role=status)
    expect(screen.getByRole('status')).toHaveTextContent(/Möchten Sie diese Hilfe anfragen/);
  });

  it('Doppel-Tap auf "Ja, Hilfe anfragen" feuert nur EINEN Alarm (W8)', async () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Allgemeine Hilfe'));
    const confirmButton = screen.getByRole('button', { name: /Ja, Hilfe anfragen/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('App-Flaeche behaelt den Server-Upsell-Text (Mapping gilt NUR fuer source=device)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: 'Ihr Abo-Plan unterstützt diese SOS-Kategorie nicht. Bitte upgraden Sie Ihren Plan.',
          requiredFeature: 'sos_all',
        }),
    });

    render(<SosCategoryPicker />); // default source='app' (Angehoerigen-Flow)
    chooseAndConfirm('Allgemeine Hilfe');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Abo-Plan/);
  });

  it('Abbrechen in der Bestaetigung feuert keinen Alarm und zeigt wieder die Kategorien (W8)', () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Einkauf / Besorgung'));
    fireEvent.click(screen.getByRole('button', { name: /Abbrechen/i }));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText('Allgemeine Hilfe')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ja, Hilfe anfragen/i }),
    ).not.toBeInTheDocument();
  });

  it('sendet API-Anfrage erst nach dem Bestaetigungs-Tap', async () => {
    render(<SosCategoryPicker />);
    chooseAndConfirm('Besuch gewuenscht');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/sos', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"category":"visit_wanted"'),
      }));
    });
  });

  it('sendet source im API-Request', async () => {
    render(<SosCategoryPicker source="device" />);
    chooseAndConfirm('Allgemeine Hilfe');

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.source).toBe('device');
    });
  });

  it('navigiert nach erfolgreichem SOS-Alert', async () => {
    render(<SosCategoryPicker />);
    chooseAndConfirm('Allgemeine Hilfe');

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/care/sos/alert-1');
    });
  });

  it('ruft onSosCreated Callback statt Navigation', async () => {
    const onSosCreated = vi.fn();
    render(<SosCategoryPicker onSosCreated={onSosCreated} />);
    chooseAndConfirm('Allgemeine Hilfe');

    await waitFor(() => {
      expect(onSosCreated).toHaveBeenCalledWith('alert-1');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('Notfall-Pfad bleibt 112-zuerst: Banner-Acknowledge feuert SOS ohne zusaetzlichen Bestaetigungsschritt', async () => {
    render(<SosCategoryPicker />);
    fireEvent.click(screen.getByText('Dringende Hilfe benötigt'));

    // 112/110-Banner zuerst (FMEA FM-NB-02), KEIN Confirm-Schritt davor
    expect(screen.getByText('Wichtiger Hinweis')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ja, Hilfe anfragen/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Kein Notruf/i }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/care/sos', expect.objectContaining({
        body: expect.stringContaining('"category":"medical_emergency"'),
      }));
    });
  });

  it('zeigt Fehler bei fehlgeschlagenem API-Aufruf (App-Flaeche: Server-Text bleibt)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Feature nicht verfügbar' }),
    });

    render(<SosCategoryPicker />);
    chooseAndConfirm('Allgemeine Hilfe');

    await waitFor(() => {
      expect(screen.getByText('Feature nicht verfügbar')).toBeInTheDocument();
    });
  });

  it('mappt den Abo-Upsell-Fehler auf der Senior-Flaeche in ruhige Sprache (W8, A3:4)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: 'Ihr Abo-Plan unterstützt diese SOS-Kategorie nicht. Bitte upgraden Sie Ihren Plan.',
          requiredFeature: 'sos_all',
        }),
    });

    render(<SosCategoryPicker source="device" />);
    chooseAndConfirm('Allgemeine Hilfe');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent(/Abo-Plan|upgraden/i);
    expect(alert).toHaveTextContent(/sprechen Sie mit Ihrer Familie/i);
  });

  it('mappt den Einwilligungs-Fehler auf der Senior-Flaeche auf einen Satz MIT Loesungsweg (W8)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Einwilligung erforderlich' }),
    });

    render(<SosCategoryPicker source="device" />);
    chooseAndConfirm('Allgemeine Hilfe');

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('Einwilligung erforderlich');
    expect(alert).toHaveTextContent(/Familie/i);
  });

  it('zeigt Verbindungsfehler bei Netzwerkproblem', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SosCategoryPicker />);
    chooseAndConfirm('Allgemeine Hilfe');

    await waitFor(() => {
      expect(screen.getByText(/Verbindungsfehler/)).toBeInTheDocument();
    });
  });

  it('Fehlermeldung hat role=alert (Befund B3:3 — Fehler darf nicht stumm bleiben)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Feature nicht verfügbar' }),
    });

    render(<SosCategoryPicker />);
    chooseAndConfirm('Allgemeine Hilfe');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Feature nicht verfügbar');
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

  it('verwendet kontraststarke Farben fuer die Notfall-Kategorie', () => {
    render(<SosCategoryPicker />);

    expect(screen.getByText(/Dringende Hilfe/)).toHaveClass('text-red-800');
    expect(screen.getByText(/Bitte rufen Sie im Notfall 112/)).toHaveClass('text-red-900');
  });
});
