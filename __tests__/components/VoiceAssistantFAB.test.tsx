import { render, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// --- Mocks (VOR dem dynamischen Import) ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// shadcn Sheet
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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// --- SpeechEngine Mock (konfigurierbar) ---

const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockCleanup = vi.fn();

const mockEngine = {
  isAvailable: vi.fn().mockReturnValue(true),
  startListening: mockStartListening,
  stopListening: mockStopListening,
  cleanup: mockCleanup,
};

// Steuerbar: null = keine Engine
let shouldReturnEngine = true;

vi.mock('@/lib/voice/create-speech-engine', () => ({
  createSpeechEngine: () => shouldReturnEngine ? mockEngine : null,
}));

vi.mock('@/components/voice/SpeakerAnimation', () => ({
  SpeakerAnimation: ({ isPlaying }: { isPlaying: boolean }) => (
    <div data-testid="speaker-animation" data-playing={isPlaying}>Speaker</div>
  ),
}));

vi.mock('@/components/voice/AudioWaveform', () => ({
  AudioWaveform: ({ audioLevel, isActive }: { audioLevel: number; isActive: boolean }) => (
    <div data-testid="audio-waveform" data-level={audioLevel} data-active={isActive}>
      Waveform
    </div>
  ),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  mockPush.mockClear();
  mockFetch.mockClear();
  mockStartListening.mockClear();
  mockStopListening.mockClear();
  mockCleanup.mockClear();
  shouldReturnEngine = true;
  global.fetch = mockFetch;
  vi.resetModules();
});

afterEach(() => {
  cleanup();
});

describe('VoiceAssistantFAB (Redesign)', () => {
  it('rendert nichts wenn kein SpeechEngine verfuegbar', async () => {
    shouldReturnEngine = false;
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { container } = render(<VoiceAssistantFAB />);
    expect(container.innerHTML).toBe('');
  });

  it('rendert FAB wenn Engine verfuegbar', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    expect(getByTestId('voice-assistant-fab')).toBeDefined();
  });

  it('hat min 56px Groesse', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    const btn = getByTestId('voice-assistant-fab');
    expect(btn.style.minWidth).toBe('56px');
    expect(btn.style.minHeight).toBe('56px');
  });

  it('oeffnet Sheet und startet Engine bei Klick', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    expect(mockStartListening).toHaveBeenCalled();
    expect(getByTestId('sheet')).toBeDefined();
  });

  it('zeigt AudioWaveform im Sheet waehrend Aufnahme', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    expect(getByTestId('audio-waveform')).toBeDefined();
  });

  it('zeigt roten Stopp-Button waehrend Aufnahme', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByRole } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    const stopBtn = getByRole('button', { name: 'Aufnahme stoppen' });
    expect(stopBtn).toBeDefined();
    expect(stopBtn.className).toContain('bg-red');
  });

  it('ruft /api/voice/assistant auf nach Transkription', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'Hilfe' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe beim Einkaufen'); });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/voice/assistant',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('zeigt Ergebnis mit Aktions-Button nach API-Antwort', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'Erkannt' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => { expect(getByText('Hilfsanfrage')).toBeDefined(); });
  });

  it('zeigt "Nochmal sprechen" Button nach Ergebnis', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'OK' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => { expect(getByText(/Nochmal sprechen/)).toBeDefined(); });
  });

  it('"Nochmal sprechen" startet neue Aufnahme', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'OK' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => { expect(getByText(/Nochmal sprechen/)).toBeDefined(); });

    fireEvent.click(getByText(/Nochmal sprechen/));
    expect(mockStartListening).toHaveBeenCalledTimes(2);
    expect(getByTestId('sheet')).toBeDefined();
  });

  it('Sheet schliesst bei "Schließen" Button', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'general', params: {}, message: 'Test' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText, queryByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Test'); });

    await waitFor(() => { expect(getByText(/Schließen/)).toBeDefined(); });

    fireEvent.click(getByText(/Schließen/));
    expect(queryByTestId('sheet')).toBeNull();
  });

  it('navigiert bei Aktions-Button und schliesst Sheet', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'Hilfe' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Einkaufen'); });

    await waitFor(() => { expect(getByText('Hilfsanfrage erstellen')).toBeDefined(); });

    fireEvent.click(getByText('Hilfsanfrage erstellen'));
    expect(mockPush).toHaveBeenCalledWith('/care/tasks');
  });

  it('zeigt Mikrofon-Hinweis bei Fehler', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onError('not-allowed'); });

    await waitFor(() => { expect(getByText(/Bitte Mikrofon freigeben/)).toBeDefined(); });
  });

  it('zeigt Speaking-State mit SpeakerAnimation nach Klassifizierung', async () => {
    // assistant API antwortet, TTS haengt (pending promise)
    let resolveTts: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          action: 'help_request',
          params: {},
          message: 'Hilfe',
          spokenResponse: 'Ich erstelle eine Hilfsanfrage für Sie.',
        }),
      })
      .mockImplementationOnce(() => new Promise(resolve => { resolveTts = resolve; }));

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => {
      expect(getByTestId('speaker-animation')).toBeDefined();
    });

    // Cleanup: TTS promise aufloesen damit kein offener Handle bleibt
    resolveTts!({ ok: false, status: 500 });
  });

  it('zeigt "Vorlesen stoppen" Button waehrend Speaking', async () => {
    let resolveTts: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          action: 'general',
          params: {},
          message: 'OK',
          spokenResponse: 'Alles klar!',
        }),
      })
      .mockImplementationOnce(() => new Promise(resolve => { resolveTts = resolve; }));

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Test'); });

    await waitFor(() => {
      expect(getByText(/Vorlesen stoppen/)).toBeDefined();
    });

    resolveTts!({ ok: false, status: 500 });
  });

  it('wechselt zu result-State nach TTS-Fehler (graceful fallback)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          action: 'help_request',
          params: {},
          message: 'Hilfe',
          spokenResponse: 'Test',
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fail

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    // Bei TTS-Fehler direkt zu result
    await waitFor(() => {
      expect(getByText('Hilfsanfrage')).toBeDefined();
    });
  });
});
