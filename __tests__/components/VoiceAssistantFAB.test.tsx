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

describe('VoiceAssistantFAB (Push-to-Talk)', () => {
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

  it('oeffnet Sheet im idle-State bei FAB-Klick (keine Aufnahme)', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    // Aufnahme startet NICHT automatisch
    expect(mockStartListening).not.toHaveBeenCalled();
    // Push-to-Talk Button ist sichtbar
    expect(getByTestId('push-to-talk-btn')).toBeDefined();
    expect(getByTestId('sheet')).toBeDefined();
  });

  it('zeigt grossen Mikrofon-Button im idle-State nach FAB-Klick', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    const pushBtn = getByTestId('push-to-talk-btn');
    expect(pushBtn).toBeDefined();
    expect(pushBtn.style.width).toBe('120px');
    expect(pushBtn.style.height).toBe('120px');
  });

  it('zeigt Anweisung "Halten Sie gedrückt zum Sprechen"', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    expect(getByText('Halten Sie gedrückt zum Sprechen')).toBeDefined();
  });

  it('startet Aufnahme bei mousedown auf Push-to-Talk Button', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('stoppt Aufnahme bei mouseup auf Push-to-Talk Button', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    const pushBtn = getByTestId('push-to-talk-btn');
    // Aufnahme starten
    fireEvent.mouseDown(pushBtn);
    expect(mockStartListening).toHaveBeenCalledTimes(1);
    // Genuegend Zeit simulieren (>500ms) — Date.now wird im Recording-Button ausgelesen
    // Da mouseDown sofort recordingStartTimeRef setzt, muessen wir Date.now mocken
    const originalNow = Date.now;
    Date.now = () => originalNow() + 1000;
    // Loslassen — Recording-Button ist jetzt im recording-State sichtbar
    fireEvent.mouseUp(getByTestId('push-to-talk-btn'));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
    Date.now = originalNow;
  });

  it('startet Aufnahme bei touchstart', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    fireEvent.touchStart(getByTestId('push-to-talk-btn'));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it('stoppt Aufnahme bei touchend', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    fireEvent.touchStart(getByTestId('push-to-talk-btn'));
    const originalNow = Date.now;
    Date.now = () => originalNow() + 1000;
    fireEvent.touchEnd(getByTestId('push-to-talk-btn'));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
    Date.now = originalNow;
  });

  it('zeigt AudioWaveform im Sheet waehrend Aufnahme', async () => {
    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId } = render(<VoiceAssistantFAB />);
    // FAB klicken → idle
    fireEvent.click(getByTestId('voice-assistant-fab'));
    // Push-to-Talk druecken → recording
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));
    expect(getByTestId('audio-waveform')).toBeDefined();
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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => { expect(getByText(/Nochmal sprechen/)).toBeDefined(); });
  });

  it('"Nochmal sprechen" kehrt zum idle-State zurueck', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ action: 'help_request', params: {}, message: 'OK' }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

    const { VoiceAssistantFAB } = await import('@/components/VoiceAssistantFAB');
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId('voice-assistant-fab'));
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    await waitFor(() => { expect(getByText(/Nochmal sprechen/)).toBeDefined(); });

    fireEvent.click(getByText(/Nochmal sprechen/));
    // Startet NICHT automatisch die Aufnahme — kehrt zum idle zurueck
    expect(mockStartListening).toHaveBeenCalledTimes(1); // nur der erste mouseDown-Aufruf
    expect(getByTestId('push-to-talk-btn')).toBeDefined();
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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

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
    fireEvent.mouseDown(getByTestId('push-to-talk-btn'));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => { callbacks.onTranscript('Hilfe'); });

    // Bei TTS-Fehler direkt zu result
    await waitFor(() => {
      expect(getByText('Hilfsanfrage')).toBeDefined();
    });
  });
});
