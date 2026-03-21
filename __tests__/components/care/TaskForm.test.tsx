import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { TaskForm } from '@/components/care/TaskForm';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock SpeechRecognition fuer VoiceInput-Integration
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
}

// Hilfsfunktion: Kategorie-Button per Emoji finden (getAllByText, da Emojis mehrfach vorkommen koennen)
function clickCategoryButton(emoji: string) {
  const emojiSpans = screen.getAllByText(emoji);
  const button = emojiSpans[0].closest('button');
  if (!button) throw new Error(`Kein Button mit Emoji ${emoji} gefunden`);
  fireEvent.click(button);
}

// Kontextbezogene Platzhalter-Tests fuer das Aufgabenformular
describe('TaskForm kontextbezogene Platzhalter', () => {
  it('zeigt Standard-Platzhalter fuer Kategorie "Sonstiges"', () => {
    render(<TaskForm />);
    const titleInput = screen.getByLabelText(/Titel/);
    // Default-Kategorie ist 'other' → "z.B. Blumen gießen im Urlaub"
    expect(titleInput.getAttribute('placeholder')).toBe('z.B. Blumen gießen im Urlaub');
  });

  it('aendert Titel-Platzhalter bei Kategorie-Wechsel auf Einkauf', () => {
    render(<TaskForm />);
    const titleInput = screen.getByLabelText(/Titel/);

    // Klick auf Einkauf-Button (Emoji: Einkaufswagen)
    clickCategoryButton('\uD83D\uDED2');

    expect(titleInput.getAttribute('placeholder')).toBe('z.B. Brot, Milch und Obst vom REWE');
  });

  it('aendert Beschreibungs-Platzhalter bei Kategorie-Wechsel auf Fahrdienst', () => {
    render(<TaskForm />);
    const descInput = screen.getByLabelText(/Beschreibung/);

    // Klick auf Fahrdienst-Button (Emoji: Auto)
    clickCategoryButton('\uD83D\uDE97');

    expect(descInput.getAttribute('placeholder')).toBe('Wohin? Wann? Rückfahrt nötig?');
  });

  it('zeigt Technik-Platzhalter bei Kategorie-Wechsel', () => {
    render(<TaskForm />);
    const titleInput = screen.getByLabelText(/Titel/);

    // Klick auf Technik-Button (Emoji: Laptop)
    clickCategoryButton('\uD83D\uDCBB');

    expect(titleInput.getAttribute('placeholder')).toBe('z.B. WLAN einrichten, Drucker anschließen');
  });

  it('wechselt Platzhalter zurueck bei erneuter Kategorie-Aenderung', () => {
    render(<TaskForm />);
    const titleInput = screen.getByLabelText(/Titel/);

    // Erst Einkauf (Einkaufswagen)
    clickCategoryButton('\uD83D\uDED2');
    expect(titleInput.getAttribute('placeholder')).toBe('z.B. Brot, Milch und Obst vom REWE');

    // Dann zurueck zu Sonstiges (Clipboard)
    clickCategoryButton('\uD83D\uDCCB');
    expect(titleInput.getAttribute('placeholder')).toBe('z.B. Blumen gießen im Urlaub');
  });

  it('hat keinen statischen Platzhalter mehr', () => {
    render(<TaskForm />);
    const titleInput = screen.getByLabelText(/Titel/);
    // Alter statischer Platzhalter darf nicht mehr vorkommen
    expect(titleInput.getAttribute('placeholder')).not.toBe('z.B. Einkauf fuer Frau Mueller');
  });
});

// Spracheingabe-Integration im Aufgabenformular
describe('TaskForm Spracheingabe-Integration', () => {
  let originalSpeechRecognition: unknown;

  beforeEach(() => {
    originalSpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition;
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    if (originalSpeechRecognition) {
      (window as unknown as Record<string, unknown>).SpeechRecognition = originalSpeechRecognition;
    } else {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    }
    vi.restoreAllMocks();
  });

  it('zeigt VoiceInput-Bereich mit Label "Oder per Sprache:"', () => {
    const { container } = render(<TaskForm />);
    const scope = within(container);
    expect(scope.getByText('Oder per Sprache:')).toBeDefined();
    expect(scope.getByTestId('voice-input')).toBeDefined();
  });

  it('ruft die KI-Klassifizierung auf und zeigt Bestaetigung', async () => {
    // Diesen Test mit findByText/waitFor statt synchroner Pruefung
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          category: 'shopping',
          title: 'Einkauf beim REWE',
          description: 'Milch und Brot besorgen',
        }),
      })
    ) as unknown as typeof fetch;

    let recognitionInstance: MockSpeechRecognition | null = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); recognitionInstance = this; }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = TrackableSR;

    const { container } = render(<TaskForm />);
    const scope = within(container);

    // Spracheingabe starten
    fireEvent.click(scope.getByRole('button', { name: /spracheingabe starten/i }));

    // Ergebnis simulieren
    act(() => {
      recognitionInstance!.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Ich brauche Einkaufshilfe' }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    // Pruefen ob fetch mit richtiger URL aufgerufen wurde
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/care/classify-task',
        expect.objectContaining({ method: 'POST' })
      );
    }, { timeout: 2000 });

    // Pruefen ob die Bestaetigung angezeigt wird
    await waitFor(() => {
      expect(scope.queryByTestId('voice-confirmation')).not.toBeNull();
    }, { timeout: 2000 });
  });

  it('ruft fetch bei Spracherkennung auf und sendet Text', async () => {
    // Verifiziert dass die KI-Klassifizierung korrekt aufgerufen wird
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Serverfehler' }),
      })
    ) as unknown as typeof fetch;

    let recognitionInstance: MockSpeechRecognition | null = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); recognitionInstance = this; }
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = TrackableSR;

    const { container } = render(<TaskForm />);
    const scope = within(container);

    fireEvent.click(scope.getByRole('button', { name: /spracheingabe starten/i }));

    act(() => {
      recognitionInstance!.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Hilfe beim Garten' }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    // Pruefen ob fetch mit dem richtigen Text aufgerufen wurde
    await waitFor(() => {
      const fetchFn = globalThis.fetch as ReturnType<typeof vi.fn>;
      expect(fetchFn).toHaveBeenCalledWith(
        '/api/care/classify-task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Hilfe beim Garten' }),
        })
      );
    }, { timeout: 2000 });
  });
});
