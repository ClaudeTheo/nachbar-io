// __tests__/components/BugReportButton.test.tsx
// Tests fuer BugReportButton:
// 1. Regulaerer User: status='new'
// 2. Admin-User: status='approved'
// 3. FAB ist klickbar und Sheet oeffnet sich
// 4. Anonymer Modus: Honeypot-Feld + API-Endpoint

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// --- Hoisted Mocks (muessen VOR vi.mock deklariert werden) ---
const { mockToastSuccess, mockToastError, mockGetUser, mockProfileSelect, mockBugReportInsert, mockFetch } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockGetUser: vi.fn(),
  mockProfileSelect: vi.fn(),
  mockBugReportInsert: vi.fn(),
  mockFetch: vi.fn(),
}));

// --- Mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// shadcn Sheet-Komponenten
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('lucide-react', () => ({
  Bug: (props: Record<string, unknown>) => <svg data-testid="icon-bug" {...props} />,
  Send: (props: Record<string, unknown>) => <svg data-testid="icon-send" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="icon-loader" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="icon-x" {...props} />,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfileSelect,
            }),
          }),
        };
      }
      if (table === 'bug_reports') {
        return { insert: mockBugReportInsert };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    },
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/screenshot.jpg' } }),
      }),
    },
  })),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toBlob: (cb: (blob: Blob | null) => void) => cb(null),
  }),
}));

// QuarterContext als React.createContext Mock (gibt null zurueck ohne Provider)
vi.mock('@/lib/quarters', () => ({
  QuarterContext: React.createContext({
    currentQuarter: { id: 'quarter-bs', name: 'Bad Säckingen' },
    allQuarters: [],
    loading: false,
    switchQuarter: () => {},
    refreshQuarter: async () => {},
  }),
}));

// Import nach Mock-Registrierung
import { BugReportButton } from '@/components/BugReportButton';

// --- Tests ---

describe('BugReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Standard: eingeloggter User
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('rendert FAB-Button mit Bug-Icon', () => {
    render(<BugReportButton />);

    const fab = screen.getByTestId('bug-report-fab');
    expect(fab).toBeDefined();
    expect(fab.getAttribute('aria-label')).toBe('Bug melden');
  });

  it('oeffnet Sheet bei Klick auf FAB', () => {
    render(<BugReportButton />);

    // Sheet ist initial nicht sichtbar
    expect(screen.queryByTestId('sheet')).toBeNull();

    // Klick auf FAB
    const fab = screen.getByTestId('bug-report-fab');
    fireEvent.click(fab);

    // Sheet muss jetzt sichtbar sein
    expect(screen.getByTestId('sheet')).toBeDefined();
  });

  it('zeigt Textarea und Buttons im geoeffneten Sheet', () => {
    render(<BugReportButton />);

    const fab = screen.getByTestId('bug-report-fab');
    fireEvent.click(fab);

    // Textarea vorhanden
    const textarea = screen.getByPlaceholderText('Was ist aufgefallen? (optional)');
    expect(textarea).toBeDefined();

    // Abbrechen-Button vorhanden
    expect(screen.getByText('Abbrechen')).toBeDefined();

    // "Bug melden" erscheint mehrfach (Titel + Button) — alle muessen da sein
    const bugMeldenElements = screen.getAllByText('Bug melden');
    expect(bugMeldenElements.length).toBeGreaterThanOrEqual(2);
  });

  it('sendet Bug-Report mit status="new" fuer regulaeren User', async () => {
    // Regulaerer User (kein Admin)
    mockProfileSelect.mockResolvedValue({
      data: { is_admin: false },
      error: null,
    });
    mockBugReportInsert.mockResolvedValue({ error: null });

    render(<BugReportButton />);

    // Sheet oeffnen
    fireEvent.click(screen.getByTestId('bug-report-fab'));

    // Submit klicken — "Bug melden" erscheint als Titel + Button
    const bugMeldenButtons = screen.getAllByText('Bug melden');
    const submitBtn = bugMeldenButtons.find(el => el.closest('button'));
    fireEvent.click(submitBtn!);

    // Warten auf async Ausfuehrung
    await waitFor(() => {
      expect(mockBugReportInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-001',
          status: 'new',  // Bug-Fix: muss 'new' sein (valid in DB)
        })
      );
    });

    // Erfolgs-Toast
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Bug-Report gesendet! Vielen Dank.');
    });
  });

  it('sendet Bug-Report mit status="approved" fuer Admin', async () => {
    // Admin-User
    mockProfileSelect.mockResolvedValue({
      data: { is_admin: true },
      error: null,
    });
    mockBugReportInsert.mockResolvedValue({ error: null });

    render(<BugReportButton />);

    // Sheet oeffnen + Submit
    fireEvent.click(screen.getByTestId('bug-report-fab'));
    const adminSubmit = screen.getAllByText('Bug melden').find(el => el.closest('button'));
    fireEvent.click(adminSubmit!);

    await waitFor(() => {
      expect(mockBugReportInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-001',
          status: 'approved',  // Admin-Reports direkt freigegeben
        })
      );
    });
  });

  it('zeigt Fehler-Toast bei Insert-Fehler', async () => {
    mockProfileSelect.mockResolvedValue({
      data: { is_admin: false },
      error: null,
    });
    mockBugReportInsert.mockResolvedValue({
      error: { message: 'Insert failed' },
    });

    render(<BugReportButton />);

    fireEvent.click(screen.getByTestId('bug-report-fab'));
    const errorSubmit = screen.getAllByText('Bug melden').find(el => el.closest('button'));
    fireEvent.click(errorSubmit!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Bug-Report konnte nicht gesendet werden.');
    });
  });

  // --- Anonymer Modus Tests ---

  describe('anonymer Modus', () => {
    it('rendert FAB-Button mit anonymous-Prop', () => {
      render(<BugReportButton anonymous />);

      const fab = screen.getByTestId('bug-report-fab');
      expect(fab).toBeDefined();
      expect(fab.getAttribute('aria-label')).toBe('Bug melden');
    });

    it('zeigt Honeypot-Feld wenn anonymous=true', () => {
      render(<BugReportButton anonymous />);

      // Sheet oeffnen
      fireEvent.click(screen.getByTestId('bug-report-fab'));

      // Honeypot-Feld muss vorhanden sein
      const honeypot = screen.getByTestId('feedback-extra');
      expect(honeypot).toBeDefined();
      expect(honeypot.getAttribute('name')).toBe('website');
      expect(honeypot.getAttribute('aria-hidden')).toBe('true');
      expect(honeypot.getAttribute('tabindex')).toBe('-1');
    });

    it('zeigt kein Honeypot-Feld wenn anonymous=false', () => {
      render(<BugReportButton />);

      // Sheet oeffnen
      fireEvent.click(screen.getByTestId('bug-report-fab'));

      // Honeypot-Feld darf NICHT vorhanden sein
      expect(screen.queryByTestId('feedback-extra')).toBeNull();
    });

    it('sendet an /api/bug-reports/anonymous wenn anonymous=true', async () => {
      // fetch mocken
      const originalFetch = global.fetch;
      global.fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<BugReportButton anonymous />);

      // Sheet oeffnen + Submit
      fireEvent.click(screen.getByTestId('bug-report-fab'));
      const submitBtn = screen.getAllByText('Bug melden').find(el => el.closest('button'));
      fireEvent.click(submitBtn!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/bug-reports/anonymous',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      // Erfolgs-Toast
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Bug-Report gesendet! Vielen Dank.');
      });

      // Supabase direct insert darf NICHT aufgerufen werden
      expect(mockBugReportInsert).not.toHaveBeenCalled();

      global.fetch = originalFetch;
    });

    it('zeigt Fehler-Toast bei API-Fehler im anonymen Modus', async () => {
      const originalFetch = global.fetch;
      global.fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Zu viele Bug-Reports' }),
      });

      render(<BugReportButton anonymous />);

      fireEvent.click(screen.getByTestId('bug-report-fab'));
      const submitBtn = screen.getAllByText('Bug melden').find(el => el.closest('button'));
      fireEvent.click(submitBtn!);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Bug-Report konnte nicht gesendet werden.');
      });

      global.fetch = originalFetch;
    });

    it('sendet Honeypot-Wert im Request-Body mit', async () => {
      const originalFetch = global.fetch;
      global.fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<BugReportButton anonymous />);

      fireEvent.click(screen.getByTestId('bug-report-fab'));

      // Request-Body pruefen — website-Feld muss leer sein (nicht ausgefuellt)
      const submitBtn = screen.getAllByText('Bug melden').find(el => el.closest('button'));
      fireEvent.click(submitBtn!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.website).toBe('');
        expect(body.page_url).toBeDefined();
      });

      global.fetch = originalFetch;
    });
  });
});
