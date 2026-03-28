// __tests__/integration/companion-streaming.test.ts
// Integrationstests fuer den KI-Companion: Streaming, Dialog, Voice-Preferences

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDialogMode } from "@/hooks/useDialogMode";
import {
  buildSystemPrompt,
  type QuarterContext,
} from "@/modules/voice/services/system-prompt";

describe("Companion Streaming Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Dialog-Modus Flow: Start -> Greeting -> Listen -> Transcript -> Processing -> Speaking -> Listen -> Stop", () => {
    const { result } = renderHook(() => useDialogMode());

    // 1. Start
    act(() => {
      result.current.startDialog();
    });
    expect(result.current.state).toBe("greeting");

    // 2. Greeting -> Listening (nach 1.5s)
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.state).toBe("listening");

    // 3. Transcript -> Processing
    act(() => {
      result.current.handleTranscript("Wann kommt der Muell?");
    });
    expect(result.current.state).toBe("processing");

    // 4. Response -> Speaking
    act(() => {
      result.current.setResponse("Der Restmuell kommt am Montag.");
    });
    expect(result.current.state).toBe("speaking");

    // 5. TTS fertig -> Listening (Loop)
    act(() => {
      result.current.setSpeakingDone();
    });
    expect(result.current.state).toBe("listening");

    // 6. Stille -> silence_check
    act(() => {
      result.current.triggerSilenceCheck();
    });
    expect(result.current.state).toBe("silence_check");

    // 7. Keine Antwort nach 3s -> idle
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.state).toBe("idle");
  });

  it("Dialog-Modus: Abschied beendet sofort", () => {
    const { result } = renderHook(() => useDialogMode());

    act(() => {
      result.current.startDialog();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.state).toBe("listening");

    // Abschied -> idle
    act(() => {
      result.current.handleTranscript("Tschuess, danke!");
    });
    expect(result.current.state).toBe("idle");
  });

  it("Dialog-Modus: Antwort waehrend silence_check bricht Timer ab", () => {
    const { result } = renderHook(() => useDialogMode());

    act(() => {
      result.current.startDialog();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Stille -> silence_check
    act(() => {
      result.current.triggerSilenceCheck();
    });
    expect(result.current.state).toBe("silence_check");

    // Neue Frage -> processing (Timer abgebrochen)
    act(() => {
      result.current.handleTranscript("Noch eine Frage");
    });
    expect(result.current.state).toBe("processing");

    // 3s vergehen -> sollte NICHT idle werden (Timer war abgebrochen)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.state).toBe("processing");
  });
});

describe("Voice-Preferences Integration", () => {
  const baseCtx: QuarterContext = {
    quarterName: "Oberer Rebberg",
    wasteDate: [{ date: "2026-03-25", type: "Restmuell" }],
    events: [],
    bulletinPosts: [],
  };

  it("Formal-Modus: System-Prompt enthält Siezen", () => {
    const prompt = buildSystemPrompt(baseCtx, { formality: "formal" });
    expect(prompt).toContain("Sie/Ihnen/Ihr");
    expect(prompt).not.toContain("du/dein/dir");
  });

  it("Informal-Modus: System-Prompt enthält Duzen", () => {
    const prompt = buildSystemPrompt(baseCtx, { formality: "informal" });
    expect(prompt).toContain("du/dein/dir");
    expect(prompt).not.toContain("Sie/Ihnen/Ihr");
  });

  it("Meals im System-Prompt wenn vorhanden", () => {
    const ctx = {
      ...baseCtx,
      meals: [
        {
          title: "Gulaschsuppe",
          type: "Portion",
          servings: 3,
          meal_date: "2026-03-25",
        },
      ],
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Gulaschsuppe");
    expect(prompt).toContain("Mitess-Angebote");
  });
});
