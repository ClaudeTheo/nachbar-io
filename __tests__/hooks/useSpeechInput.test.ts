// __tests__/hooks/useSpeechInput.test.ts
// Welle C C6b — useSpeechInput Hook
//
// Wiederverwendet `createSpeechEngine` aus modules/voice/engines/ (Whisper-First,
// Native-Fallback). Liefert eine schmale Hook-API fuer den Onboarding-Wizard:
// start/stop/isAvailable/recording/speechState. Race-Fix mit useTtsPlayback
// passiert NICHT im Hook, sondern im Aufrufer (WizardChat ruft tts.stop() vor
// useSpeechInput.start()) — Hook bleibt single-purpose.

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useSpeechInput } from "@/modules/voice/hooks/useSpeechInput";
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineState,
} from "@/modules/voice/engines/speech-engine";

// --- Mock SpeechEngine + createSpeechEngine -----------------------------
function createMockEngine(): SpeechEngine & {
  __callbacks: SpeechEngineCallbacks | null;
  __available: boolean;
} {
  const m = {
    __callbacks: null as SpeechEngineCallbacks | null,
    __available: true,
    isAvailable: vi.fn(() => m.__available),
    startListening: vi.fn((cb: SpeechEngineCallbacks) => {
      m.__callbacks = cb;
    }),
    stopListening: vi.fn(),
    cleanup: vi.fn(),
  };
  return m;
}

const engineState = {
  current: null as ReturnType<typeof createMockEngine> | null,
};

vi.mock("@/modules/voice/engines/create-speech-engine", () => ({
  createSpeechEngine: () => engineState.current,
}));

beforeEach(() => {
  vi.clearAllMocks();
  engineState.current = createMockEngine();
});

describe("useSpeechInput", () => {
  describe("Verfuegbarkeit", () => {
    it("isAvailable=true wenn createSpeechEngine eine Engine liefert", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      expect(result.current.isAvailable).toBe(true);
    });

    it("isAvailable=false wenn createSpeechEngine null liefert", () => {
      engineState.current = null;
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      expect(result.current.isAvailable).toBe(false);
    });

    it("start() ist no-op wenn keine Engine verfuegbar", () => {
      engineState.current = null;
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useSpeechInput({ onTranscript }));
      act(() => result.current.start());
      // kein Throw, recording bleibt false
      expect(result.current.recording).toBe(false);
    });
  });

  describe("Lifecycle", () => {
    it("start() ruft engine.startListening", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      expect(engineState.current!.startListening).toHaveBeenCalledTimes(1);
    });

    it("start() setzt recording=true", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      expect(result.current.recording).toBe(true);
    });

    it("stop() ruft engine.stopListening und setzt recording=false", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      act(() => result.current.stop());
      expect(engineState.current!.stopListening).toHaveBeenCalledTimes(1);
      expect(result.current.recording).toBe(false);
    });

    it("cleanup() der Engine wird beim Unmount aufgerufen", () => {
      const { unmount } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      const engine = engineState.current!;
      unmount();
      expect(engine.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("Engine-Callbacks", () => {
    it("onTranscript aus Engine ruft user-onTranscript", () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useSpeechInput({ onTranscript }));
      act(() => result.current.start());
      act(() => engineState.current!.__callbacks!.onTranscript("Hallo"));
      expect(onTranscript).toHaveBeenCalledWith("Hallo");
    });

    it("onTranscript setzt recording=false (Aufnahme zu Ende)", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      act(() => engineState.current!.__callbacks!.onTranscript("Hallo"));
      expect(result.current.recording).toBe(false);
    });

    it("onStateChange aus Engine wird zu speechState", () => {
      const states: SpeechEngineState[] = [];
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      act(() => engineState.current!.__callbacks!.onStateChange("listening"));
      states.push(result.current.speechState);
      act(() => engineState.current!.__callbacks!.onStateChange("processing"));
      states.push(result.current.speechState);
      expect(states).toEqual(["listening", "processing"]);
    });

    it("onStateChange='idle' setzt recording=false", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      act(() => engineState.current!.__callbacks!.onStateChange("idle"));
      expect(result.current.recording).toBe(false);
    });

    it("onError aus Engine ruft user-onError und setzt recording=false", () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {}, onError }),
      );
      act(() => result.current.start());
      act(() =>
        engineState.current!.__callbacks!.onError("Mikrofon nicht verfuegbar"),
      );
      expect(onError).toHaveBeenCalledWith("Mikrofon nicht verfuegbar");
      expect(result.current.recording).toBe(false);
    });

    it("onError ohne user-onError throwt nicht", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      expect(() =>
        act(() => engineState.current!.__callbacks!.onError("kaputt")),
      ).not.toThrow();
    });
  });

  describe("Doppel-Start verhindern", () => {
    it("start() waehrend recording laeuft → kein zweites startListening", () => {
      const { result } = renderHook(() =>
        useSpeechInput({ onTranscript: () => {} }),
      );
      act(() => result.current.start());
      act(() => result.current.start());
      expect(engineState.current!.startListening).toHaveBeenCalledTimes(1);
    });
  });
});
