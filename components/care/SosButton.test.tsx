// components/care/SosButton.test.tsx
// Nachbar.io — Tests fuer SOS-Button (Sicherheitskritisch: Touch-Targets, Navigation)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SosButton } from './SosButton';

// Router-Mock mit referenzierbarem push
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('lucide-react', () => ({
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SosButton', () => {
  it('rendert mit korrektem aria-label', () => {
    render(<SosButton />);
    expect(screen.getByLabelText('SOS — Ich brauche Hilfe')).toBeInTheDocument();
  });

  it('zeigt "Ich brauche Hilfe" Text im Standard-Modus', () => {
    render(<SosButton />);
    expect(screen.getByText(/Ich brauche Hilfe/)).toBeInTheDocument();
  });

  it('zeigt nur "SOS" im Compact-Modus', () => {
    render(<SosButton compact />);
    expect(screen.getByText('SOS')).toBeInTheDocument();
    expect(screen.queryByText(/Ich brauche Hilfe/)).not.toBeInTheDocument();
  });

  it('navigiert zu /care/sos/new bei Klick (Standard-href)', () => {
    render(<SosButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/care/sos/new');
  });

  it('navigiert zu benutzerdefiniertem href', () => {
    render(<SosButton href="/sos/custom" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/sos/custom');
  });

  it('hat minHeight 100px im Standard-Modus (Senior Touch-Target)', () => {
    render(<SosButton />);
    const btn = screen.getByRole('button');
    expect(btn.style.minHeight).toBe('100px');
  });

  it('hat minHeight 60px im Compact-Modus', () => {
    render(<SosButton compact />);
    const btn = screen.getByRole('button');
    expect(btn.style.minHeight).toBe('60px');
  });

  it('hat touchAction: manipulation (Doppelklick-Zoom verhindern)', () => {
    render(<SosButton />);
    const btn = screen.getByRole('button');
    expect(btn.style.touchAction).toBe('manipulation');
  });

  it('zeigt AlertTriangle Icon', () => {
    render(<SosButton />);
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });
});
