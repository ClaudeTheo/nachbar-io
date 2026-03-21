// components/care/CareErrorBoundary.test.tsx
// Nachbar.io — Tests fuer Care Error Boundary (Strukturiertes Logging, Benutzerfreundlichkeit)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CareErrorBoundary } from './CareErrorBoundary';

vi.mock('lucide-react', () => ({
  TriangleAlert: (props: Record<string, unknown>) => <svg data-testid="alert-icon" {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Hilfskomponente die einen Fehler wirft
function ThrowingChild({ error }: { error: Error }): React.ReactNode {
  throw error;
}

// Hilfskomponente die keinen Fehler wirft
function HappyChild() {
  return <div>Alles gut</div>;
}

describe('CareErrorBoundary', () => {
  it('rendert Kinder wenn kein Fehler auftritt', () => {
    render(
      <CareErrorBoundary>
        <HappyChild />
      </CareErrorBoundary>
    );
    expect(screen.getByText('Alles gut')).toBeInTheDocument();
  });

  it('zeigt Fehler-UI wenn Kind einen Fehler wirft', () => {
    // console.error unterdruecken (React Error Boundary loggt)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Test-Fehler')} />
      </CareErrorBoundary>
    );

    expect(screen.getByText('Etwas ist schiefgelaufen')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('zeigt Standard-Fallback-Nachricht', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Fehler')} />
      </CareErrorBoundary>
    );

    expect(screen.getByText(/unerwarteter Fehler/)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('zeigt benutzerdefinierte Fallback-Nachricht', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary fallbackMessage="Bitte wenden Sie sich an den Support.">
        <ThrowingChild error={new Error('Fehler')} />
      </CareErrorBoundary>
    );

    expect(screen.getByText('Bitte wenden Sie sich an den Support.')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('zeigt Fehlermeldung im Detail', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Medikamentenplan konnte nicht geladen werden')} />
      </CareErrorBoundary>
    );

    expect(screen.getByText('Medikamentenplan konnte nicht geladen werden')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('hat "Seite neu laden" Button', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Fehler')} />
      </CareErrorBoundary>
    );

    expect(screen.getByText('Seite neu laden')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('ruft window.location.reload bei Klick auf "Seite neu laden"', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Fehler')} />
      </CareErrorBoundary>
    );

    fireEvent.click(screen.getByText('Seite neu laden'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('loggt strukturiertes JSON bei Fehler (Vercel Logs kompatibel)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CareErrorBoundary>
        <ThrowingChild error={new Error('Kritischer UI-Fehler')} />
      </CareErrorBoundary>
    );

    // componentDidCatch loggt strukturiertes JSON
    const jsonCall = errorSpy.mock.calls.find(call => {
      try {
        const parsed = JSON.parse(call[0]);
        return parsed.module === 'care/ui';
      } catch { return false; }
    });
    expect(jsonCall).toBeDefined();

    const logEntry = JSON.parse(jsonCall![0]);
    expect(logEntry.module).toBe('care/ui');
    expect(logEntry.action).toBe('error_boundary_caught');
    expect(logEntry.error).toBe('Kritischer UI-Fehler');
    expect(logEntry.timestamp).toBeDefined();
    errorSpy.mockRestore();
  });
});
