import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HelperRegistrationForm } from '@/components/hilfe/HelperRegistrationForm';

// Fetch mocken
global.fetch = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('HelperRegistrationForm', () => {
  it('rendert Bundesland-Auswahl', () => {
    render(<HelperRegistrationForm />);
    expect(screen.getByLabelText('Bundesland')).toBeInTheDocument();
    // Alle 4 Bundeslaender als Optionen vorhanden
    expect(screen.getByText('Baden-Wuerttemberg')).toBeInTheDocument();
    expect(screen.getByText('Bayern')).toBeInTheDocument();
    expect(screen.getByText('Nordrhein-Westfalen')).toBeInTheDocument();
    expect(screen.getByText('Bremen')).toBeInTheDocument();
  });

  it('zeigt 3 Checkboxen (verwandt, Haushalt, Rahmenbedingungen)', () => {
    render(<HelperRegistrationForm />);
    expect(
      screen.getAllByText(/nicht verwandt oder verschwaegert bis zum 2\. Grad/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/nicht im selben Haushalt/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Rahmenbedingungen nach §45a SGB XI/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('zeigt Schulungsnachweis nur bei NW-Auswahl', () => {
    render(<HelperRegistrationForm />);
    // Anfangs kein Schulungsnachweis sichtbar
    expect(screen.queryByLabelText('Schulungsnachweis')).not.toBeInTheDocument();

    // NW auswaehlen
    fireEvent.change(screen.getByLabelText('Bundesland'), {
      target: { value: 'NW' },
    });

    expect(screen.getByLabelText('Schulungsnachweis')).toBeInTheDocument();
  });

  it('zeigt Bremen-Warnung bei HB-Auswahl', () => {
    render(<HelperRegistrationForm />);
    // Anfangs keine Warnung
    expect(
      screen.queryByText(/Bremen nicht ueber den Entlastungsbetrag/),
    ).not.toBeInTheDocument();

    // HB auswaehlen
    fireEvent.change(screen.getByLabelText('Bundesland'), {
      target: { value: 'HB' },
    });

    expect(
      screen.getByText(/Bremen nicht ueber den Entlastungsbetrag/),
    ).toBeInTheDocument();
  });

  it('zeigt Stundensatz-Eingabe mit Hinweis', () => {
    render(<HelperRegistrationForm />);
    expect(screen.getByLabelText('Stundensatz')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Ueblich: 12,50 - 20,00 EUR\/Stunde/).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
