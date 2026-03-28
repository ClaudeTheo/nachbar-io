import { describe, it, expect, vi } from "vitest";
import { SilenceDetector } from "@/modules/voice/engines/silence-detector";

describe("SilenceDetector", () => {
  it("feuert onSilence nach konfigurierter Dauer", () => {
    vi.useFakeTimers();
    const onSilence = vi.fn();
    const detector = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence,
    });

    // Simuliere Stille (level < threshold)
    for (let i = 0; i < 100; i++) {
      detector.feedAudioLevel(0.01);
      vi.advanceTimersByTime(33); // ~30fps
    }

    expect(onSilence).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("resettet Timer bei Audio ueber Schwellenwert", () => {
    vi.useFakeTimers();
    const onSilence = vi.fn();
    const detector = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence,
    });

    // 2 Sekunden Stille
    for (let i = 0; i < 60; i++) {
      detector.feedAudioLevel(0.01);
      vi.advanceTimersByTime(33);
    }

    // Dann Audio
    detector.feedAudioLevel(0.5);

    // Nochmal 2 Sekunden Stille — sollte NICHT reichen
    for (let i = 0; i < 60; i++) {
      detector.feedAudioLevel(0.01);
      vi.advanceTimersByTime(33);
    }

    expect(onSilence).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("gibt aktuellen Audio-Level zurueck (fuer UI)", () => {
    const detector = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence: vi.fn(),
    });
    detector.feedAudioLevel(0.7);
    expect(detector.currentLevel).toBe(0.7);
  });

  it("cleanup stoppt alles", () => {
    const onSilence = vi.fn();
    const detector = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence,
    });
    detector.cleanup();
    // Sollte keine Fehler werfen und onSilence nicht feuern
    detector.feedAudioLevel(0.5);
    expect(onSilence).not.toHaveBeenCalled();
  });

  it("meldet Level-Aenderungen ueber Callback", () => {
    const onLevelChange = vi.fn();
    const detector = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence: vi.fn(),
      onLevelChange,
    });
    detector.feedAudioLevel(0.42);
    expect(onLevelChange).toHaveBeenCalledWith(0.42);
  });
});
