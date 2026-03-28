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
    mockFetch
      .mockResolvedValueOnce(sseResponse("Ich helfe Ihnen gerne."))
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Ich erstelle eine Hilfsanfrage fuer Sie."),
      )
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
    mockFetch
      .mockResolvedValueOnce(sseResponse("OK"))
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
    mockFetch
      .mockResolvedValueOnce(sseResponse("OK"))
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
    mockFetch
      .mockResolvedValueOnce(sseResponse("Test"))
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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

  it("zeigt Speaking-State mit SpeakerAnimation nach Companion-Antwort", async () => {
    // Companion API antwortet, TTS haengt (pending promise)
    let resolveTts: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Ich erstelle eine Hilfsanfrage fuer Sie."),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveTts = resolve;
          }),
      );

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    await waitFor(() => {
      expect(getByTestId("speaker-animation")).toBeDefined();
    });

    // Cleanup: TTS promise aufloesen damit kein offener Handle bleibt
    resolveTts!({ ok: false, status: 500 });
  });

  it('zeigt "Vorlesen stoppen" Button waehrend Speaking', async () => {
    let resolveTts: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce(sseResponse("Alles klar!"))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveTts = resolve;
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

    await waitFor(() => {
      expect(getByText(/Vorlesen stoppen/)).toBeDefined();
    });

    resolveTts!({ ok: false, status: 500 });
  });

  it("wechselt zu result-State nach TTS-Fehler (graceful fallback)", async () => {
    mockFetch
      .mockResolvedValueOnce(sseResponse("Hilfe"))
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fail

    const { VoiceAssistantFAB } =
      await import("@/modules/voice/components/VoiceAssistantFAB");
    const { getByTestId, getByText } = render(<VoiceAssistantFAB />);
    fireEvent.click(getByTestId("voice-assistant-fab"));
    fireEvent.mouseDown(getByTestId("push-to-talk-btn"));

    const callbacks = mockStartListening.mock.calls[0][0];
    await act(async () => {
      callbacks.onTranscript("Hilfe");
    });

    // Bei TTS-Fehler direkt zu result
    await waitFor(() => {
      expect(getByText("Quartier-Lotse")).toBeDefined();
    });
  });

  it("zeigt Tool-Ergebnisse als ActionCards", async () => {
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Hier sind Ihre Termine.", {
          toolEvents: [
            'event: tool\ndata: {"name":"get_waste_dates","result":{"success":true,"summary":"Mo, 24.03.2026: Restmuell"}}',
          ],
        }),
      )
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
    mockFetch
      .mockResolvedValueOnce(
        sseResponse("Soll ich den Beitrag erstellen?", {
          confirmationEvents: [
            'event: confirmation\ndata: {"tool":"create_bulletin_post","params":{"title":"Test","text":"Hallo"},"description":"Beitrag \\"Test\\" auf dem Schwarzen Brett veroeffentlichen"}',
          ],
        }),
      )
      .mockResolvedValueOnce({ ok: false, status: 500 }); // TTS fallback

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
      .mockResolvedValueOnce({ ok: false, status: 500 }) // TTS fallback
      .mockResolvedValueOnce(
        companionResponse("Erledigt!", {
          toolResults: [{ success: true, summary: "Beitrag erstellt." }],
        }),
      ); // confirmTool bleibt JSON

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
      // Zweiter API-Aufruf muss confirmTool enthalten
      const secondCall = mockFetch.mock.calls[2]; // [0]=companion, [1]=tts, [2]=confirm
      const secondBody = JSON.parse(secondCall[1].body);
      expect(secondBody.confirmTool).toBeDefined();
      expect(secondBody.confirmTool.tool).toBe("create_bulletin_post");
    });
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
