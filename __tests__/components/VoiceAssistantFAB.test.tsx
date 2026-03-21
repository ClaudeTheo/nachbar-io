import { render, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// --- Mocks (VOR dem dynamischen Import) ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// shadcn Sheet: Einfache div-Wrapper die open pruefen
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Toast mock
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// --- SpeechRecognition Mock ---

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

function enableSpeechRecognition(ctor: unknown = MockSpeechRecognition) {
  (window as unknown as Record<string, unknown>).SpeechRecognition = ctor;
}

function disableSpeechRecognition() {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
}

// Fetch-Mock
const mockFetch = vi.fn();

beforeEach(() => {
  mockPush.mockClear();
  mockFetch.mockClear();
  global.fetch = mockFetch;
  // Modul-Cache leeren damit jeder Test frisch importiert
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  disableSpeechRecognition();
});

describe('VoiceAssistantFAB', () => {
  it('rendert nichts wenn SpeechRecognition nicht verfuegbar', async () => {
    disableSpeechRecognition();
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { container } = render(<VoiceAssistantFAB />);
    expect(container.innerHTML).toBe('');
  });

  it('rendert FAB mit aria-label "Sprachassistent" wenn SpeechRecognition verfuegbar', async () => {
    enableSpeechRecognition();
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByRole } = render(<VoiceAssistantFAB />);
    expect(getByRole('button', { name: 'Sprachassistent' })).toBeDefined();
  });

  it('hat min 56px Groesse (minWidth + minHeight)', async () => {
    enableSpeechRecognition();
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    const button = getByTestId('voice-assistant-fab');
    expect(button.style.minWidth).toBe('56px');
    expect(button.style.minHeight).toBe('56px');
  });

  it('hat CSS-Klassen fixed bottom-24 right-4 fuer Positionierung', async () => {
    enableSpeechRecognition();
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    const button = getByTestId('voice-assistant-fab');
    expect(button.className).toContain('fixed');
    expect(button.className).toContain('bottom-24');
    expect(button.className).toContain('right-4');
  });

  it('startet Aufnahme bei Klick (Label wechselt zu "Aufnahme stoppen")', async () => {
    enableSpeechRecognition();
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByRole } = render(<VoiceAssistantFAB />);

    fireEvent.click(getByTestId('voice-assistant-fab'));

    expect(getByRole('button', { name: 'Aufnahme stoppen' })).toBeDefined();
  });

  it('ruft /api/voice/assistant auf nach Spracherkennung', async () => {
    let instance: MockSpeechRecognition | null = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    enableSpeechRecognition(TrackableSR);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ action: 'general', params: {}, message: 'Test' }),
    });

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);

    fireEvent.click(getByTestId('voice-assistant-fab'));

    // Finale Spracheingabe simulieren
    await act(async () => {
      instance?.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Hilfe beim Einkaufen', confidence: 0.9 }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/voice/assistant',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Hilfe beim Einkaufen' }),
        })
      );
    });
  });

  it('navigiert bei action "navigate" mit router.push', async () => {
    let instance: MockSpeechRecognition | null = null;
    class TrackableSR extends MockSpeechRecognition {
      constructor() { super(); instance = this; }
    }
    enableSpeechRecognition(TrackableSR);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        action: 'navigate',
        params: { route: '/dashboard' },
        message: 'Öffne Dashboard',
      }),
    });

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);

    fireEvent.click(getByTestId('voice-assistant-fab'));

    await act(async () => {
      instance?.onresult?.({
        results: [{ isFinal: true, 0: { transcript: 'Öffne Dashboard', confidence: 0.9 }, length: 1 }],
        resultIndex: 0,
        length: 1,
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
