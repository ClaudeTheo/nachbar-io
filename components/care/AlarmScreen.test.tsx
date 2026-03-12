// components/care/AlarmScreen.test.tsx
// Nachbar.io — Tests fuer Vollbild-Alarm (Sicherheitskritisch: Check-in, Senior UX)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AlarmScreen } from './AlarmScreen';

vi.mock('lucide-react', () => ({
  AlarmClock: (props: Record<string, unknown>) => <svg data-testid="alarm-icon" {...props} />,
  BellOff: (props: Record<string, unknown>) => <svg data-testid="belloff-icon" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AlarmScreen', () => {
  const defaultProps = {
    onDismiss: vi.fn().mockResolvedValue(true),
    onSnooze: vi.fn(),
  };

  it('zeigt "Check-in Zeit" Text', () => {
    render(<AlarmScreen {...defaultProps} />);
    expect(screen.getByText('Check-in Zeit')).toBeInTheDocument();
  });

  it('zeigt "Aus" Button', () => {
    render(<AlarmScreen {...defaultProps} />);
    expect(screen.getByText('Aus')).toBeInTheDocument();
  });

  it('zeigt "Schlummern (10 Min.)" Button', () => {
    render(<AlarmScreen {...defaultProps} />);
    expect(screen.getByText('Schlummern (10 Min.)')).toBeInTheDocument();
  });

  it('ruft onDismiss bei Klick auf "Aus"', async () => {
    const onDismiss = vi.fn().mockResolvedValue(true);
    render(<AlarmScreen onDismiss={onDismiss} onSnooze={vi.fn()} />);

    fireEvent.click(screen.getByText('Aus'));

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('zeigt Erfolgs-Screen nach erfolgreichem Dismiss', async () => {
    const onDismiss = vi.fn().mockResolvedValue(true);
    render(<AlarmScreen onDismiss={onDismiss} onSnooze={vi.fn()} />);

    fireEvent.click(screen.getByText('Aus'));

    await waitFor(() => {
      expect(screen.getByText('Guten Morgen!')).toBeInTheDocument();
      expect(screen.getByText('Check-in erledigt.')).toBeInTheDocument();
    });
  });

  it('zeigt KEINEN Erfolgs-Screen bei fehlgeschlagenem Dismiss', async () => {
    const onDismiss = vi.fn().mockResolvedValue(false);
    render(<AlarmScreen onDismiss={onDismiss} onSnooze={vi.fn()} />);

    fireEvent.click(screen.getByText('Aus'));

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
    expect(screen.queryByText('Guten Morgen!')).not.toBeInTheDocument();
  });

  it('ruft onSnooze(10) bei Klick auf "Schlummern"', () => {
    render(<AlarmScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('Schlummern (10 Min.)'));
    expect(defaultProps.onSnooze).toHaveBeenCalledWith(10);
  });

  it('zeigt Hinweis zur automatischen Check-in-Bestaetigung', () => {
    render(<AlarmScreen {...defaultProps} />);
    expect(screen.getByText(/bestaetigt automatisch Ihren Check-in/)).toBeInTheDocument();
  });

  it('"Aus"-Button hat minHeight 80px (Senior Touch-Target)', () => {
    render(<AlarmScreen {...defaultProps} />);
    // "Aus" ist im ersten Button
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].style.minHeight).toBe('80px');
  });

  it('"Schlummern"-Button hat minHeight 60px', () => {
    render(<AlarmScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1].style.minHeight).toBe('60px');
  });

  it('beide Buttons haben touchAction: manipulation', () => {
    render(<AlarmScreen {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].style.touchAction).toBe('manipulation');
    expect(buttons[1].style.touchAction).toBe('manipulation');
  });
});
