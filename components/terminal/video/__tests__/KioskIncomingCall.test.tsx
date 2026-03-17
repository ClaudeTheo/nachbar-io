import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import KioskIncomingCall from '../KioskIncomingCall';

describe('KioskIncomingCall', () => {
  const defaultProps = {
    callerName: 'Lisa',
    callerAvatar: null as string | null,
    autoAnswer: false,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onNotNow: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('zeigt den Namen des Anrufers', () => {
    render(<KioskIncomingCall {...defaultProps} />);
    expect(screen.getByText('Lisa')).toBeInTheDocument();
    expect(screen.getByText(/ruft an/i)).toBeInTheDocument();
  });

  it('zeigt Annehmen- und Ablehnen-Buttons (80px)', () => {
    render(<KioskIncomingCall {...defaultProps} />);
    const accept = screen.getByRole('button', { name: /annehmen/i });
    const decline = screen.getByRole('button', { name: /ablehnen/i });
    expect(accept).toBeInTheDocument();
    expect(decline).toBeInTheDocument();
    expect(accept.className).toMatch(/min-h-\[80px\]/);
  });

  it('ruft onAccept bei Klick auf Annehmen', () => {
    render(<KioskIncomingCall {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /annehmen/i }));
    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('lehnt nach 30s automatisch ab (kein Auto-Answer)', () => {
    render(<KioskIncomingCall {...defaultProps} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(defaultProps.onDecline).toHaveBeenCalledTimes(1);
  });

  it('zeigt Auto-Answer-Countdown wenn autoAnswer=true', () => {
    render(<KioskIncomingCall {...defaultProps} autoAnswer={true} />);
    expect(screen.getByText(/wird in \d+ Sekunden durchgestellt/i)).toBeInTheDocument();
  });

  it('nimmt nach 30s automatisch an bei Auto-Answer', () => {
    render(<KioskIncomingCall {...defaultProps} autoAnswer={true} />);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('zeigt "Nicht jetzt"-Button bei Auto-Answer statt Ablehnen', () => {
    render(<KioskIncomingCall {...defaultProps} autoAnswer={true} />);
    expect(screen.getByRole('button', { name: /nicht jetzt/i })).toBeInTheDocument();
  });
});
