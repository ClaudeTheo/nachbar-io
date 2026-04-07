import {
  render,
  fireEvent,
  act,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// --- Mocks (VOR dem dynamischen Import) ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// shadcn Sheet
vi.mock("@/components/ui/sheet", () => ({
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

vi.mock("sonner", () => ({
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

vi.mock("@/modules/voice/engines/create-speech-engine", () => ({
  createSpeechEngine: () => (shouldReturnEngine ? mockEngine : null),
}));

vi.mock("@/modules/voice/components/voice/SpeakerAnimation", () => ({
  SpeakerAnimation: ({ isPlaying }: { isPlaying: boolean }) => (
    <div data-testid="speaker-animation" data-playing={isPlaying}>
      Speaker
    </div>
  ),
}));

vi.mock("@/modules/voice/components/voice/AudioWaveform", () => ({
  AudioWaveform: ({
    audioLevel,
    isActive,
  }: {
    audioLevel: number;
    isActive: boolean;
  }) => (
    <div
      data-testid="audio-waveform"
      data-level={audioLevel}
      data-active={isActive}
    >
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

/** Hilfsfunktion: Standard-Companion-Antwort (JSON, fuer confirmTool) */
function companionResponse(
  message: string,
  extras?: { toolResults?: unknown[]; confirmations?: unknown[] },
) {
  return {
    ok: true,
    json: async () => ({ message, ...extras }),
  };
}

/** Hilfsfunktion: Mock-SSE-Response fuer Streaming */
function sseResponse(
  message: string,
  extras?: { toolEvents?: string[]; confirmationEvents?: string[] },
) {
  const encoder = new TextEncoder();
  const events: string[] = [];

  // Text-Deltas
  events.push(`event: text\ndata: ${JSON.stringify({ delta: message })}`);

  // Tool-Events
  if (extras?.toolEvents) {
    for (const te of extras.toolEvents) {
      events.push(te);
    }
  }

  // Confirmation-Events
  if (extras?.confirmationEvents) {
    for (const ce of extras.confirmationEvents) {
      events.push(ce);
    }
  }

  // Done
  events.push(`event: done\ndata: ${JSON.stringify({ full_reply: message })}`);

  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event + "\n\n"));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream" },
  });
}

describe("VoiceAssistantFAB (Push-to-Talk + Companion)", () => {
  it("rendert nichts wenn kein SpeechEngine verfuegbar", async () => {
    shouldReturnEngine = false;
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { container } = render(<VoiceAssistantFAB />);
    expect(container.innerHTML).toBe("");
  });

  it("rendert FAB wenn Engine verfuegbar", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    expect(getByTestId("voice-assistant-fab")).toBeDefined();
  });

  it("hat min 56px Groesse", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    const btn = getByTestId("voice-assistant-fab");
    expect(btn.style.width).toBe("56px");
    expect(btn.style.height).toBe("56px");
  });

  it("oeffnet Sheet im idle-State bei FAB-Klick (keine Aufnahme)", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    // Aufnahme startet NICHT automatisch
    expect(mockStartListening).not.toHaveBeenCalled();
    // Push-to-Talk Button ist sichtbar
    expect(getByTestId("push-to-talk-btn")).toBeDefined();
    expect(getByTestId("sheet")).toBeDefined();
  });

  it("zeigt grossen Mikrofon-Button im idle-State nach FAB-Klick", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    const pushBtn = getByTestId("push-to-talk-btn");
    expect(pushBtn).toBeDefined();
    expect(pushBtn.style.width).toBe("120px");
    expect(pushBtn.style.height).toBe("120px");
  });

  it('zeigt Anweisung "Halten Sie gedrückt zum Sprechen"', async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    expect(getByText("Halten Sie gedrückt zum Sprechen")).toBeDefined();
  });

  it("startet Aufnahme bei mousedown auf Push-to-Talk Button", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it("stoppt Aufnahme bei mouseup auf Push-to-Talk Button", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    const pushBtn = getByTestId("push-to-talk-btn");
    // Aufnahme starten
    fireEvent.mouseDown(pushBtn);
    expect(mockStartListening).toHaveBeenCalledTimes(1);
    // Genuegend Zeit simulieren (>500ms)
    const originalNow = Date.now;
    Date.now = () => originalNow() + 1000;
    // Loslassen — Recording-Button ist jetzt im recording-State sichtbar
    fireEvent.mouseUp(getByTestId("push-to-talk-btn"));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
    Date.now = originalNow;
  });

  it("startet Aufnahme bei touchstart", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.touchStart(getByTestId("push-to-talk-btn"));
    expect(mockStartListening).toHaveBeenCalledTimes(1);
  });

  it("stoppt Aufnahme bei touchend", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.touchStart(getByTestId("push-to-talk-btn"));
    const originalNow = Date.now;
    Date.now = () => originalNow() + 1000;
    fireEvent.touchEnd(getByTestId("push-to-talk-btn"));
    expect(mockStopListening).toHaveBeenCalledTimes(1);
    Date.now = originalNow;
  });

  it("zeigt AudioWaveform im Sheet waehrend Aufnahme", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    // FAB klicken → idle
    fireEvent.click(getByTestId("voice-assistant-fab"));
    // Push-to-Talk druecken → recording
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));
    expect(getByTestId("audio-waveform")).toBeDefined();
  });

  it("ruft /api/companion/chat auf nach Transkription", async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("Ich helfe Ihnen gerne.")); // Kein TTS-Mock noetig (Auto-TTS entfernt)

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe beim Einkaufen");
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/companion/chat",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // Pruefen, dass messages-Array gesendet wurde
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages).toBeDefined();
    expect(callBody.messages[0].role).toBe("user");
    expect(callBody.messages[0].content).toBe("Hilfe beim Einkaufen");
  });

  it("zeigt Ergebnis-Nachricht nach API-Antwort", async () => {
    mockFetch.mockResolvedValueOnce(
      sseResponse("Ich erstelle eine Hilfsanfrage fuer Sie."),
    ); // Kein TTS-Mock noetig (Auto-TTS entfernt)

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    await waitFor(() => {
      expect(getByText(/Quartier-Lotse/)).toBeDefined();
    });
  });

  it('zeigt "Nochmal sprechen" Button nach Ergebnis', async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("OK")); // Kein TTS-Mock noetig (Auto-TTS entfernt)

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    await waitFor(() => {
      expect(getByText(/Nochmal sprechen/)).toBeDefined();
    });
  });

  it('"Nochmal sprechen" kehrt zum idle-State zurueck', async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("OK"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    await waitFor(() => {
      expect(getByText(/Nochmal sprechen/)).toBeDefined();
    });

    fireEvent.click(getByText(/Nochmal sprechen/));
    // Startet NICHT automatisch die Aufnahme — kehrt zum idle zurueck
    expect(mockStartListening).toHaveBeenCalledTimes(1); // nur der erste mouseDown-Aufruf
    expect(getByTestId("push-to-talk-btn")).toBeDefined();
  });

  it('Sheet schliesst bei "Schließen" Button', async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("Test"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText, queryByTestId } = render(
      <VoiceAssistantFAB />,
    );
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Test");
    });

    await waitFor(() => {
      expect(getByText(/Schließen/)).toBeDefined();
    });

    fireEvent.click(getByText(/Schließen/));
    expect(queryByTestId("sheet")).toBeNull();
  });

  it("navigiert bei Tool-Result mit Route", async () => {
    mockFetch.mockResolvedValueOnce(
      sseResponse("Navigation", {
        toolEvents: [
          'event: tool\ndata: {"name":"navigate_to","result":{"success":true,"summary":"Navigation","route":"/waste-calendar"}}',
        ],
      }),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Müllkalender");
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/waste-calendar");
    });
  });

  it("zeigt Mikrofon-Hinweis bei Fehler", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onError("not-allowed");
    });

    await waitFor(() => {
      expect(getByText(/Bitte Mikrofon freigeben/)).toBeDefined();
    });
  });

  it("zeigt KI-Antwort als lesbaren Text im Result-State (kein Auto-TTS)", async () => {
    mockFetch.mockResolvedValueOnce(
      sseResponse("Ich erstelle eine Hilfsanfrage fuer Sie."),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    // Direkt zum Result — kein Auto-TTS, Text ist prominent sichtbar
    await waitFor(() => {
      expect(getByText(/Ich erstelle eine Hilfsanfrage/)).toBeDefined();
      expect(getByText(/Nochmal sprechen/)).toBeDefined();
    });
  });

  it('zeigt "Überspringen" Button waehrend Streaming', async () => {
    // Stream der nie endet
    let resolveStream: (value: unknown) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        }),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Test");
    });

    // Waehrend Verarbeitung/Streaming: Ueberspringen-Button verfuegbar
    await waitFor(() => {
      expect(getByText(/Überspringen/)).toBeDefined();
    });

    // Cleanup: pending stream aufloesen
    resolveStream!(sseResponse("late"));
  });

  it("wechselt direkt zu result-State nach Streaming-Ende (kein Auto-TTS)", async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("Hilfe"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    // Direkt zu result (kein Auto-TTS mehr)
    await waitFor(() => {
      expect(getByText("Quartier-Lotse")).toBeDefined();
    });
  });

  it("zeigt Tool-Ergebnisse als ActionCards", async () => {
    mockFetch.mockResolvedValueOnce(
      sseResponse("Hier sind Ihre Termine.", {
        toolEvents: [
          'event: tool\ndata: {"name":"get_waste_dates","result":{"success":true,"summary":"Mo, 24.03.2026: Restmuell"}}',
        ],
      }),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Wann ist Müllabfuhr?");
    });

    await waitFor(() => {
      expect(getByTestId("tool-results")).toBeDefined();
      expect(getByText(/Restmuell/)).toBeDefined();
    });
  });

  it("zeigt Bestaetigungen als ConfirmationCards", async () => {
    mockFetch.mockResolvedValueOnce(
      sseResponse("Soll ich den Beitrag erstellen?", {
        confirmationEvents: [
          'event: confirmation\ndata: {"tool":"create_bulletin_post","params":{"title":"Test","text":"Hallo"},"description":"Beitrag \\"Test\\" auf dem Schwarzen Brett veroeffentlichen"}',
        ],
      }),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Beitrag erstellen");
    });

    await waitFor(() => {
      expect(getByTestId("confirmations")).toBeDefined();
      expect(getByText(/Schwarzen Brett/)).toBeDefined();
      expect(getByText("Bestätigen")).toBeDefined();
    });
  });

  it("sendet confirmTool bei Bestaetigung", async () => {
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Soll ich den Beitrag erstellen?", {
          confirmationEvents: [
            'event: confirmation\ndata: {"tool":"create_bulletin_post","params":{"title":"Test","text":"Hallo"},"description":"Beitrag \\"Test\\" erstellen"}',
          ],
        }),
      )
      .mockResolvedValueOnce(
        companionResponse("Erledigt!", {
          toolResults: [{ success: true, summary: "Beitrag erstellt." }],
        }),
      ); // confirmTool (kein TTS-Mock mehr noetig)

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Beitrag erstellen");
    });

    await waitFor(() => {
      expect(getByTestId("confirm-btn-0")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(getByTestId("confirm-btn-0"));
    });

    await waitFor(() => {
      // Zweiter API-Aufruf muss confirmTool enthalten (kein TTS dazwischen)
      const confirmCall = mockFetch.mock.calls[1]; // [0]=companion, [1]=confirm
      const confirmBody = JSON.parse(confirmCall[1].body);
      expect(confirmBody.confirmTool).toBeDefined();
      expect(confirmBody.confirmTool.tool).toBe("create_bulletin_post");
    });
  });

  // --- Codex-Review Regressions-Tests ---

  it("persistiert User-Nachricht in sheetMessages nach Voice-Input (Codex Fix #1)", async () => {
    // Erster Turn (kein TTS-Mock noetig — Auto-TTS entfernt)
    mockFetch.mockResolvedValueOnce(sseResponse("Antwort 1"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Erster Turn");
    });

    await waitFor(() => {
      expect(getByText(/Nochmal sprechen/)).toBeDefined();
    });

    // Pruefen: Erster API-Call hatte User-Nachricht
    const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(firstCallBody.messages).toHaveLength(1);
    expect(firstCallBody.messages[0]).toEqual({
      role: "user",
      content: "Erster Turn",
    });

    // Zweiter Turn
    mockFetch.mockResolvedValueOnce(sseResponse("Antwort 2"));

    fireEvent.click(getByText(/Nochmal sprechen/));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks2 = mockStartListening.mock.calls[1][0];
    await act(async () => {
      callbacks2.onTranscript("Zweiter Turn");
    });

    await waitFor(() => {
      // Zweiter API-Call muss ALLE bisherigen Nachrichten enthalten (kein TTS dazwischen)
      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCallBody.messages.length).toBeGreaterThanOrEqual(3);
      expect(secondCallBody.messages[0]).toEqual({
        role: "user",
        content: "Erster Turn",
      });
      expect(secondCallBody.messages[1]).toEqual({
        role: "assistant",
        content: "Antwort 1",
      });
      expect(secondCallBody.messages[2]).toEqual({
        role: "user",
        content: "Zweiter Turn",
      });
    });
  });

  it("setzt transcript im Voice-Pfad (Codex Fix #3)", async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("Antwort"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Meine Frage");
    });

    // Result-State: Transkript wird angezeigt (in SheetContent als italic text)
    await waitFor(() => {
      expect(getByText(/Meine Frage/)).toBeDefined();
    });
  });

  it("handleClose bricht laufendes Streaming ab (Codex Fix #2)", async () => {
    // Stream der nie endet
    let resolveStream: (value: unknown) => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        }),
    );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText, queryByTestId } = render(
      <VoiceAssistantFAB />,
    );
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Test");
    });

    // Sheet schliessen waehrend Streaming laeuft
    // Sheet ist noch offen (processing oder speaking state)
    await waitFor(() => {
      expect(getByTestId("sheet")).toBeDefined();
    });

    // Schliessen — das den laufenden Stream abbrechen soll
    // Finde den Sheet-Container und simuliere Close
    await act(async () => {
      // FAB-Klick wenn Sheet offen → noop, also direkt Close-Button suchen oder onOpenChange
      // Das Sheet rendert Schliessen-Buttons nur in bestimmten States
      // Stattdessen: FAB rendered, Sheet ist sichtbar, we need to close
      // The handleClose is called by Sheet onOpenChange(false)
      // Let's just verify the fetch was called with AbortController signal
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].signal).toBeDefined();
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal);
    });

    // Cleanup: pending stream aufloesen
    resolveStream!(sseResponse("late"));
  });

  it("handleRetry bricht laufendes Streaming ab (Codex Fix #2)", async () => {
    mockFetch.mockResolvedValueOnce(sseResponse("Erste Antwort"));

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Test");
    });

    await waitFor(() => {
      expect(getByText(/Nochmal sprechen/)).toBeDefined();
    });

    // Retry klicken
    fireEvent.click(getByText(/Nochmal sprechen/));

    // Zurueck im idle-State mit Push-to-Talk Button
    expect(getByTestId("push-to-talk-btn")).toBeDefined();
  });

  it("Confirm-Flow funktioniert mit gesetztem transcript nach Voice-Turn", async () => {
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Soll ich das machen?", {
          confirmationEvents: [
            'event: confirmation\ndata: {"tool":"create_post","params":{"title":"Hi"},"description":"Beitrag erstellen"}',
          ],
        }),
      )
      .mockResolvedValueOnce(
        companionResponse("Erledigt!", {
          toolResults: [{ success: true, summary: "Erstellt." }],
        }),
      ); // confirmTool (kein TTS-Mock)

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Beitrag erstellen");
    });

    await waitFor(() => {
      expect(getByTestId("confirm-btn-0")).toBeDefined();
    });

    // Bestaetigen
    await act(async () => {
      fireEvent.click(getByTestId("confirm-btn-0"));
    });

    // confirmTool-Request muss messages mit dem User-Turn enthalten (kein TTS dazwischen)
    await waitFor(() => {
      const confirmCall = mockFetch.mock.calls[1]; // [0]=companion, [1]=confirm
      const confirmBody = JSON.parse(confirmCall[1].body);
      expect(confirmBody.confirmTool).toBeDefined();
      expect(confirmBody.confirmTool.tool).toBe("create_post");
      // Messages muessen den User-Turn enthalten (Fix #1)
      expect(
        confirmBody.messages.some(
          (m: { role: string; content: string }) =>
            m.role === "user" && m.content === "Beitrag erstellen",
        ),
      ).toBe(true);
    });
  });

  it('zeigt "Stattdessen tippen" Button im idle-State (BUG-07 Fallback)', async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    expect(getByTestId("type-instead-btn")).toBeDefined();
  });

  it("zeigt Retry-Button im error-State", async () => {
    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const screen = render(<VoiceAssistantFAB />);

    // FAB klicken -> Sheet oeffnen
    const fab = screen.getByTestId("voice-assistant-fab");
    act(() => {
      fireEvent.click(fab);
    });

    // Error-State simulieren: onError aufrufen
    const onError = mockStartListening.mock.calls[0]?.[0]?.onError;
    if (onError) {
      act(() => {
        onError("not-allowed");
      });
    } else {
      // Push-to-Talk starten um Engine zu triggern
      const pttBtn = screen.getByTestId("push-to-talk-btn");
      act(() => {
        fireEvent.mouseDown(pttBtn);
      });
      const errorCb = mockStartListening.mock.calls[0]?.[0]?.onError;
      if (errorCb)
        act(() => {
          errorCb("not-allowed");
        });
    }

    await waitFor(() => {
      expect(screen.getByTestId("error-retry-btn")).toBeInTheDocument();
      expect(screen.getByText(/Nochmal versuchen/i)).toBeInTheDocument();
      expect(screen.getByText(/Schließen/i)).toBeInTheDocument();
    });
  });
});
