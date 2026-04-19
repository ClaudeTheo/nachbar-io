// __tests__/components/onboarding/WizardChat.test.tsx
// Welle C C6 — KI-Wizard-Chat-Komponente.
//
// Komposition aus useOnboardingTurn + useTtsPlayback + MemoryConfirmDialog.
// Text-Input MVP (Senior soll auch ohne Mikro tippen koennen). STT-Button
// kommt in C6b.

import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { WizardChat } from "@/modules/voice/components/onboarding/WizardChat";
import type { UseOnboardingTurnReturn } from "@/modules/voice/hooks/useOnboardingTurn";
import type { UseTtsPlaybackReturn } from "@/modules/voice/hooks/useTtsPlayback";
import type { UseSpeechInputReturn } from "@/modules/voice/hooks/useSpeechInput";

// --- Hook-Mocks (zentral, damit wir Test-Szenarien einfach steuern) -----
const onboardingState: { current: UseOnboardingTurnReturn } = {
  current: {
    messages: [],
    isLoading: false,
    error: null,
    pendingConfirmations: [],
    sendUserInput: vi.fn(),
    confirmMemory: vi.fn(),
    dismissConfirmation: vi.fn(),
    reset: vi.fn(),
  },
};
vi.mock("@/modules/voice/hooks/useOnboardingTurn", () => ({
  useOnboardingTurn: () => onboardingState.current,
}));

const ttsState: { current: UseTtsPlaybackReturn } = {
  current: {
    play: vi.fn(async () => undefined),
    stop: vi.fn(),
    isLoading: false,
    isPlaying: false,
  },
};
vi.mock("@/modules/voice/hooks/useTtsPlayback", () => ({
  useTtsPlayback: () => ttsState.current,
}));

// Speech-Input-Mock — speichert die uebergebenen Optionen, damit Tests
// onTranscript / onError aus der Hook-Sicht ausloesen koennen.
const speechState: {
  current: UseSpeechInputReturn;
  lastOptions: {
    onTranscript: (text: string) => void;
    onError?: (m: string) => void;
  } | null;
} = {
  current: {
    isAvailable: true,
    recording: false,
    speechState: "idle",
    start: vi.fn(),
    stop: vi.fn(),
  },
  lastOptions: null,
};
vi.mock("@/modules/voice/hooks/useSpeechInput", () => ({
  useSpeechInput: (options: {
    onTranscript: (text: string) => void;
    onError?: (m: string) => void;
  }) => {
    speechState.lastOptions = options;
    return speechState.current;
  },
}));

function setOnboarding(partial: Partial<UseOnboardingTurnReturn>) {
  onboardingState.current = { ...onboardingState.current, ...partial };
}

function setSpeech(partial: Partial<UseSpeechInputReturn>) {
  speechState.current = { ...speechState.current, ...partial };
}

beforeEach(() => {
  vi.clearAllMocks();
  onboardingState.current = {
    messages: [],
    isLoading: false,
    error: null,
    pendingConfirmations: [],
    sendUserInput: vi.fn(),
    confirmMemory: vi.fn(),
    dismissConfirmation: vi.fn(),
    reset: vi.fn(),
  };
  ttsState.current = {
    play: vi.fn(async () => undefined),
    stop: vi.fn(),
    isLoading: false,
    isPlaying: false,
  };
  speechState.current = {
    isAvailable: true,
    recording: false,
    speechState: "idle",
    start: vi.fn(),
    stop: vi.fn(),
  };
  speechState.lastOptions = null;
});

afterEach(() => cleanup());

describe("WizardChat", () => {
  it("zeigt Text-Input + Senden-Button im leeren Zustand", () => {
    render(<WizardChat />);
    expect(
      screen.getByPlaceholderText(/ihre antwort|tippen|nachricht/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /senden|abschicken/i }),
    ).toBeInTheDocument();
  });

  it("ruft sendUserInput beim Klick auf Senden mit dem getippten Text", async () => {
    const sendUserInput = vi.fn(async () => undefined);
    setOnboarding({ sendUserInput });
    const user = userEvent.setup();
    render(<WizardChat />);

    const input = screen.getByPlaceholderText(/ihre antwort|tippen|nachricht/i);
    await user.type(input, "Mein Name ist Anna");
    await user.click(
      screen.getByRole("button", { name: /senden|abschicken/i }),
    );

    expect(sendUserInput).toHaveBeenCalledWith("Mein Name ist Anna");
  });

  it("leert den Input nach erfolgreichem Senden", async () => {
    const sendUserInput = vi.fn(async () => undefined);
    setOnboarding({ sendUserInput });
    const user = userEvent.setup();
    render(<WizardChat />);

    const input = screen.getByPlaceholderText(
      /ihre antwort|tippen|nachricht/i,
    ) as HTMLInputElement;
    await user.type(input, "Hallo");
    await user.click(
      screen.getByRole("button", { name: /senden|abschicken/i }),
    );

    expect(input.value).toBe("");
  });

  it("rendert messages als Bubbles (user-Bubble + assistant-Bubble)", () => {
    setOnboarding({
      messages: [
        { role: "user", content: "Hallo" },
        { role: "assistant", content: "Schoen Sie kennenzulernen." },
      ],
    });
    render(<WizardChat />);

    expect(screen.getByText("Hallo")).toBeInTheDocument();
    expect(screen.getByText("Schoen Sie kennenzulernen.")).toBeInTheDocument();
  });

  it("Senden-Button ist deaktiviert wenn isLoading=true", () => {
    setOnboarding({ isLoading: true });
    render(<WizardChat />);
    const btn = screen.getByRole("button", { name: /senden|abschicken/i });
    expect(btn).toBeDisabled();
  });

  it("Senior-Mode: Input + Senden-Button haben min-height >= 80px", () => {
    render(<WizardChat />);
    const input = screen.getByPlaceholderText(
      /ihre antwort|tippen|nachricht/i,
    ) as HTMLInputElement;
    const btn = screen.getByRole("button", { name: /senden|abschicken/i });
    expect(input.style.minHeight).toBe("80px");
    expect(btn.style.minHeight).toBe("80px");
  });

  it("zeigt Fehlermeldung wenn error='ai_disabled'", () => {
    setOnboarding({ error: "ai_disabled" });
    render(<WizardChat />);
    expect(
      screen.getByText(/nicht verfuegbar|deaktiviert|nicht erreichbar/i),
    ).toBeInTheDocument();
  });

  it("zeigt MemoryConfirmDialog wenn pendingConfirmations vorhanden", () => {
    setOnboarding({
      pendingConfirmations: [
        {
          ok: true,
          mode: "confirm",
          factId: null,
          category: "personal",
          key: "geburtstag",
          value: "1942-03-12",
        },
      ],
    });
    render(<WizardChat />);
    // Dialog rendert Wert
    expect(screen.getByText("1942-03-12")).toBeInTheDocument();
  });

  it("Klick auf 'Ja, speichern' ruft confirmMemory mit dem item", async () => {
    const confirmMemory = vi.fn(async () => undefined);
    const item = {
      ok: true as const,
      mode: "confirm" as const,
      factId: null,
      category: "personal" as const,
      key: "geburtstag",
      value: "1942-03-12",
    };
    setOnboarding({ pendingConfirmations: [item], confirmMemory });
    const user = userEvent.setup();
    render(<WizardChat />);

    await user.click(screen.getByRole("button", { name: /ja.*speichern/i }));
    expect(confirmMemory).toHaveBeenCalledWith(item);
  });

  it("Auto-Play TTS: ruft play() mit dem letzten assistant-Text auf", async () => {
    const play = vi.fn(async () => undefined);
    ttsState.current = { ...ttsState.current, play };

    const { rerender } = render(<WizardChat />);

    await act(async () => {
      setOnboarding({
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Willkommen." },
        ],
      });
      rerender(<WizardChat />);
    });

    expect(play).toHaveBeenCalledWith("Willkommen.");
  });

  // --- C6b: STT-Mikrofon ----------------------------------------------
  describe("Mikrofon-Button (C6b)", () => {
    it("rendert Mikrofon-Button wenn isAvailable=true", () => {
      render(<WizardChat />);
      expect(
        screen.getByRole("button", { name: /mikrofon|sprechen|aufnehmen/i }),
      ).toBeInTheDocument();
    });

    it("rendert KEINEN Mikrofon-Button wenn isAvailable=false", () => {
      setSpeech({ isAvailable: false });
      render(<WizardChat />);
      expect(
        screen.queryByRole("button", { name: /mikrofon|sprechen|aufnehmen/i }),
      ).not.toBeInTheDocument();
    });

    it("Klick startet die Aufnahme (ruft speech.start)", async () => {
      const start = vi.fn();
      setSpeech({ start });
      const user = userEvent.setup();
      render(<WizardChat />);

      await user.click(
        screen.getByRole("button", { name: /mikrofon|sprechen|aufnehmen/i }),
      );
      expect(start).toHaveBeenCalledTimes(1);
    });

    it("Race-Fix: tts.stop() wird VOR speech.start() gerufen", async () => {
      const callOrder: string[] = [];
      const ttsStop = vi.fn(() => callOrder.push("tts.stop"));
      const speechStart = vi.fn(() => callOrder.push("speech.start"));
      ttsState.current = { ...ttsState.current, stop: ttsStop };
      setSpeech({ start: speechStart });

      const user = userEvent.setup();
      render(<WizardChat />);

      await user.click(
        screen.getByRole("button", { name: /mikrofon|sprechen|aufnehmen/i }),
      );
      expect(callOrder).toEqual(["tts.stop", "speech.start"]);
    });

    it("Klick waehrend recording=true ruft speech.stop (Toggle)", async () => {
      const stop = vi.fn();
      setSpeech({ recording: true, stop });
      const user = userEvent.setup();
      render(<WizardChat />);

      await user.click(
        screen.getByRole("button", {
          name: /aufnahme.*stop|stop.*aufnahme|aufnahme beenden/i,
        }),
      );
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it("recording=true: Button hat anderes Label (Listening-Feedback)", () => {
      setSpeech({ recording: true });
      render(<WizardChat />);
      // Im recording-State soll der Button visuell anders sein —
      // ueber das Label "Aufnahme beenden" o.ae. erkennbar.
      expect(
        screen.getByRole("button", {
          name: /aufnahme.*stop|stop.*aufnahme|aufnahme beenden/i,
        }),
      ).toBeInTheDocument();
    });

    it("onTranscript-Callback aus Hook setzt den Input-Text", async () => {
      render(<WizardChat />);
      // Hook wurde mit Optionen aufgerufen — wir simulieren onTranscript.
      expect(speechState.lastOptions).not.toBeNull();
      await act(async () => {
        speechState.lastOptions!.onTranscript("Mein Name ist Anna");
      });

      const input = screen.getByPlaceholderText(
        /ihre antwort|tippen|nachricht/i,
      ) as HTMLInputElement;
      expect(input.value).toBe("Mein Name ist Anna");
    });

    it("Senior-Mode: Mikrofon-Button hat min-height >= 80px", () => {
      render(<WizardChat />);
      const btn = screen.getByRole("button", {
        name: /mikrofon|sprechen|aufnehmen/i,
      });
      expect(btn.style.minHeight).toBe("80px");
    });
  });
});
