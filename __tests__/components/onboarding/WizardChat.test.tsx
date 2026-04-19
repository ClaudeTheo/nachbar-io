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

function setOnboarding(partial: Partial<UseOnboardingTurnReturn>) {
  onboardingState.current = { ...onboardingState.current, ...partial };
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
});
