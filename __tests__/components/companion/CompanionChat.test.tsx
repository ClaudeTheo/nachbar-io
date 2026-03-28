import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

// --- Mocks (VOR den Imports) ---

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// SpeechEngine Mock
const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockCleanup = vi.fn();

const mockEngine = {
  isAvailable: vi.fn().mockReturnValue(true),
  startListening: mockStartListening,
  stopListening: mockStopListening,
  cleanup: mockCleanup,
};

let shouldReturnEngine = true;

vi.mock("@/modules/voice/engines/create-speech-engine", () => ({
  createSpeechEngine: () => (shouldReturnEngine ? mockEngine : null),
}));

// Fetch Mock
const mockFetch = vi.fn();

// Hilfsfunktion: Mock-SSE-Response fuer Streaming
function mockSSEResponse(events: string[]) {
  const encoder = new TextEncoder();
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

beforeEach(() => {
  mockStartListening.mockClear();
  mockStopListening.mockClear();
  mockCleanup.mockClear();
  mockFetch.mockClear();
  shouldReturnEngine = true;
  global.fetch = mockFetch;

  // sessionStorage leeren
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
});

afterEach(() => {
  cleanup();
});

describe("CompanionChat", () => {
  it("rendert Eingabefeld und Senden-Button", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId } = render(<CompanionChat />);

    expect(getByTestId("companion-input")).toBeDefined();
    expect(getByTestId("companion-send")).toBeDefined();
  });

  it("zeigt Willkommensnachricht beim Mount", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByText } = render(<CompanionChat />);

    expect(
      getByText(
        "Hallo! Ich bin Ihr KI-Assistent für das Quartier. Wie kann ich Ihnen helfen?",
      ),
    ).toBeDefined();
  });

  it("rendert Mikrofon-Button", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId } = render(<CompanionChat />);

    expect(getByTestId("companion-mic")).toBeDefined();
  });

  it("rendert TTSButton auf KI-Nachrichten", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getAllByTestId } = render(<CompanionChat />);

    // Willkommensnachricht hat einen TTS-Button
    const ttsButtons = getAllByTestId("tts-button");
    expect(ttsButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("rendert Quartier-Lotse Header", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByText } = render(<CompanionChat />);

    expect(getByText("Quartier-Lotse")).toBeDefined();
  });

  it("sendet Nachricht bei Klick auf Senden (Streaming)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSSEResponse([
        'event: text\ndata: {"delta":"Test-Antwort "}',
        'event: text\ndata: {"delta":"vom Lotsen"}',
        'event: done\ndata: {"full_reply":"Test-Antwort vom Lotsen"}',
      ]),
    );

    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId, getByText } = render(<CompanionChat />);

    // Text eingeben
    const input = getByTestId("companion-input");
    fireEvent.change(input, {
      target: { value: "Wann ist der naechste Muelltermin?" },
    });

    // Senden
    fireEvent.click(getByTestId("companion-send"));

    // User-Nachricht sichtbar
    expect(getByText("Wann ist der naechste Muelltermin?")).toBeDefined();

    // KI-Antwort nach Streaming
    await waitFor(() => {
      expect(getByText("Test-Antwort vom Lotsen")).toBeDefined();
    });
  });

  it("zeigt Tipp-Indikator waehrend Warten auf Stream", async () => {
    // Langsamer SSE-Stream der erst nach einer Pause Text liefert
    const encoder = new TextEncoder();
    let streamStarted = false;
    const stream = new ReadableStream({
      start(controller) {
        streamStarted = true;
        // Stream offen lassen ohne Daten -> typing indicator bleibt sichtbar
        // Cleanup nach Test
        setTimeout(() => {
          controller.enqueue(
            encoder.encode('event: done\ndata: {"full_reply":"OK"}\n\n'),
          );
          controller.close();
        }, 5000);
      },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(stream, {
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId } = render(<CompanionChat />);

    // Text eingeben und senden
    fireEvent.change(getByTestId("companion-input"), {
      target: { value: "Hallo" },
    });
    fireEvent.click(getByTestId("companion-send"));

    await waitFor(() => {
      expect(streamStarted).toBe(true);
      expect(getByTestId("typing-indicator")).toBeDefined();
    });
  });

  it("deaktiviert Senden-Button wenn Eingabe leer", async () => {
    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId } = render(<CompanionChat />);

    const sendBtn = getByTestId("companion-send") as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it("zeigt Streaming-Text waehrend Antwort", async () => {
    // Langsamer Stream der nicht sofort resolved
    let resolveStream: () => void;
    const streamPromise = new Promise<void>((r) => {
      resolveStream = r;
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode('event: text\ndata: {"delta":"Streaming..."}\n\n'),
        );
        await streamPromise; // Warten bis wir den Stream schliessen
        controller.enqueue(
          encoder.encode(
            'event: done\ndata: {"full_reply":"Streaming..."}\n\n',
          ),
        );
        controller.close();
      },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(stream, {
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId, getByText } = render(<CompanionChat />);

    fireEvent.change(getByTestId("companion-input"), {
      target: { value: "Test" },
    });
    fireEvent.click(getByTestId("companion-send"));

    // Streaming-Text sichtbar
    await waitFor(() => {
      expect(getByText("Streaming...")).toBeDefined();
    });

    // Stream beenden
    resolveStream!();
  });

  it("zeigt Fehlermeldung bei Netzwerkfehler", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { CompanionChat } =
      await import("@/modules/voice/components/companion/CompanionChat");
    const { getByTestId, getByText } = render(<CompanionChat />);

    fireEvent.change(getByTestId("companion-input"), {
      target: { value: "Test" },
    });
    fireEvent.click(getByTestId("companion-send"));

    await waitFor(() => {
      expect(
        getByText(
          "Entschuldigung, es gab einen Verbindungsfehler. Bitte versuchen Sie es erneut.",
        ),
      ).toBeDefined();
    });
  });
});

describe("ActionCard", () => {
  it("zeigt Erfolg mit gruener Umrandung", async () => {
    const { ActionCard } =
      await import("@/modules/voice/components/companion/ActionCard");
    const { getByTestId, getByText } = render(
      <ActionCard
        tool="Muellkalender"
        summary="Naechster Termin: Montag"
        success={true}
      />,
    );

    expect(getByTestId("action-card")).toBeDefined();
    expect(getByText("Muellkalender")).toBeDefined();
    expect(getByText("Naechster Termin: Montag")).toBeDefined();
  });

  it("zeigt Fehler mit roter Umrandung", async () => {
    const { ActionCard } =
      await import("@/modules/voice/components/companion/ActionCard");
    const { getByTestId } = render(
      <ActionCard tool="Test" summary="Fehlgeschlagen" success={false} />,
    );

    const card = getByTestId("action-card");
    expect(card.className).toContain("border-red");
  });
});

describe("ConfirmationCard", () => {
  it("zeigt Abschicken und Abbrechen Buttons", async () => {
    const { ConfirmationCard } =
      await import("@/modules/voice/components/companion/ConfirmationCard");
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { getByTestId, getByText } = render(
      <ConfirmationCard
        tool="Schwarzes Brett"
        summary="Beitrag veroeffentlichen"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(getByTestId("confirmation-card")).toBeDefined();
    expect(getByText("Abschicken")).toBeDefined();
    expect(getByText("Abbrechen")).toBeDefined();

    // Klick-Handler testen
    fireEvent.click(getByTestId("confirm-action"));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.click(getByTestId("cancel-action"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe("TTSButton", () => {
  it("rendert Vorlesen-Button", async () => {
    const { TTSButton } =
      await import("@/modules/voice/components/companion/TTSButton");
    const { getByTestId, getByText } = render(<TTSButton text="Hallo Welt" />);

    expect(getByTestId("tts-button")).toBeDefined();
    expect(getByText("Vorlesen")).toBeDefined();
  });

  it("ist deaktiviert wenn kein Text", async () => {
    const { TTSButton } =
      await import("@/modules/voice/components/companion/TTSButton");
    const { getByTestId } = render(<TTSButton text="" />);

    const btn = getByTestId("tts-button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
