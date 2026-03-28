import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SessionDocForm from '@/modules/hilfe/components/SessionDocForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SessionDocForm', () => {
  it('rendert Datum-, Startzeit- und Endzeit-Eingabefelder', () => {
    render(<SessionDocForm matchId="match-1" helperRate={1500} />);

    expect(screen.getByLabelText('Datum')).toBeDefined();
    expect(screen.getByLabelText('Startzeit')).toBeDefined();
    expect(screen.getByLabelText('Endzeit')).toBeDefined();
  });

  it('zeigt beide Unterschriftenfeld-Labels an', () => {
    render(<SessionDocForm matchId="match-1" helperRate={1500} />);

    expect(screen.getByText('Unterschrift Helfer')).toBeDefined();
    expect(screen.getByText('Unterschrift Pflegebedürftiger')).toBeDefined();
  });

  it('berechnet die Dauer automatisch aus Start- und Endzeit', () => {
    render(<SessionDocForm matchId="match-1" helperRate={1500} />);

    const startInput = screen.getByLabelText('Startzeit');
    const endInput = screen.getByLabelText('Endzeit');

    fireEvent.change(startInput, { target: { value: '10:00' } });
    fireEvent.change(endInput, { target: { value: '11:30' } });

    const durationEl = screen.getByTestId('duration-display');
    expect(durationEl.textContent).toBe('90 Minuten');
  });

  it('zeigt den Absende-Button "Einsatz dokumentieren"', () => {
    render(<SessionDocForm matchId="match-1" helperRate={1500} />);

    const button = screen.getByRole('button', { name: /einsatz dokumentieren/i });
    expect(button).toBeDefined();
  });

  it('zeigt den Stundensatz korrekt formatiert an', () => {
    render(<SessionDocForm matchId="match-1" helperRate={1500} />);

    // 1500 Cent = 15,00 EUR
    expect(screen.getByText('15,00 EUR/Stunde')).toBeDefined();
  });
});
