import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '@/components/care/TaskForm';
import { describe, it, expect } from 'vitest';

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
