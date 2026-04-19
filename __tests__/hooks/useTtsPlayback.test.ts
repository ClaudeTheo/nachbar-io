// __tests__/hooks/useTtsPlayback.test.ts
// Welle C C6 — useTtsPlayback Hook
// Wiederverwendet TTS-Pattern aus modules/voice/components/companion/TTSButton.tsx,
// extrahiert in einen Hook fuer Auto-Play (Onboarding-Wizard ohne Klick).

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useTtsPlayback } from "@/modules/voice/hooks/useTtsPlayback";

// --- iOS Audio Manager Mock ---------------------------------------------
const iosManagerMock = {
  canPlay: vi.fn(() => false),
  playBlob: vi.fn(async () => undefined),
  stop: vi.fn(),
};
vi.mock("@/modules/voice/services/ios-audio-manager", () => ({
  getIOSAudioManager: () => iosManagerMock,
}));

// --- sonner Toast Mock --------------------------------------------------
const toastErrorMock = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}));

// --- HTMLAudioElement Mock ---------------------------------------------
class MockAudio {
  src: string;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  paused = true;
  currentTime = 0;
  static lastInstance: MockAudio | null = null;
  static playMock = vi.fn(async () => undefined);

  constructor(src: string) {
    this.src = src;
    MockAudio.lastInstance = this;
  }

  async play() {
    this.paused = false;
    return MockAudio.playMock();
  }

  pause() {
    this.paused = true;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  iosManagerMock.canPlay.mockReturnValue(false);
  iosManagerMock.playBlob.mockResolvedValue(undefined);

  MockAudio.lastInstance = null;
  MockAudio.playMock = vi.fn(async () => undefined);
  globalThis.Audio = MockAudio as unknown as typeof Audio;

  // URL.createObjectURL / revokeObjectURL Mocks
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:mock-url"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });

  // localStorage Voice-Prefs
  localStorage.setItem(
    "quartier-voice-prefs-synced",
    JSON.stringify({ voice: "ash", speed: 0.95 }),
  );
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function mockTtsFetch() {
  // mockImplementation statt mockResolvedValue, damit jeder Call eine neue
  // Response liefert (sonst ist der Body nach dem ersten .blob() konsumiert).
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(new Blob(["audio"], { type: "audio/mpeg" }), {
        status: 200,
      }) as unknown as Response,
  );
}

describe("useTtsPlayback", () => {
  it("ruft POST /api/voice/tts mit Text + Voice-Prefs aus localStorage", async () => {
    const fetchSpy = mockTtsFetch();
    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Hallo Welt");
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/voice/tts");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      text: "Hallo Welt",
      voice: "ash",
      speed: 0.95,
    });
  });

  it("ruft KEIN fetch fuer leeren oder whitespace-Text", async () => {
    const fetchSpy = mockTtsFetch();
    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("");
    });
    await act(async () => {
      await result.current.play("   ");
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("setzt isLoading waehrend fetch und isPlaying nach Start", async () => {
    let resolveFetch: ((v: Response) => void) | null = null;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((r) => {
        resolveFetch = r;
      }) as Promise<Response>,
    );

    const { result } = renderHook(() => useTtsPlayback());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaying).toBe(false);

    let playPromise: Promise<void> | undefined;
    act(() => {
      playPromise = result.current.play("Test");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolveFetch!(
        new Response(new Blob(["a"], { type: "audio/mpeg" }), { status: 200 }),
      );
      await playPromise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaying).toBe(true);
  });

  it("nutzt iOS-AudioManager wenn canPlay() true ist (kein HTMLAudioElement)", async () => {
    iosManagerMock.canPlay.mockReturnValue(true);
    mockTtsFetch();

    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    expect(iosManagerMock.playBlob).toHaveBeenCalledTimes(1);
    expect(MockAudio.lastInstance).toBeNull();
  });

  it("faellt auf HTMLAudioElement zurueck wenn iOS-Manager nicht kann", async () => {
    iosManagerMock.canPlay.mockReturnValue(false);
    mockTtsFetch();

    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    expect(iosManagerMock.playBlob).not.toHaveBeenCalled();
    expect(MockAudio.lastInstance).not.toBeNull();
  });

  it("setzt isPlaying false wenn HTMLAudio onended feuert", async () => {
    mockTtsFetch();
    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    expect(result.current.isPlaying).toBe(true);
    expect(MockAudio.lastInstance).not.toBeNull();

    act(() => {
      MockAudio.lastInstance?.onended?.();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it("stop() ruft iOS-Manager.stop() und HTMLAudio.pause()", async () => {
    mockTtsFetch();
    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    act(() => {
      result.current.stop();
    });

    expect(iosManagerMock.stop).toHaveBeenCalled();
    expect(MockAudio.lastInstance?.paused).toBe(true);
    expect(result.current.isPlaying).toBe(false);
  });

  it("play() waehrend laufendem Audio stoppt erst, dann startet neu", async () => {
    mockTtsFetch();
    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Erste");
    });
    const first = MockAudio.lastInstance;
    expect(first).not.toBeNull();

    await act(async () => {
      await result.current.play("Zweite");
    });

    // erste Audio sollte gestoppt sein
    expect(first?.paused).toBe(true);
    // neue Audio-Instanz wurde erstellt
    expect(MockAudio.lastInstance).not.toBe(first);
    expect(result.current.isPlaying).toBe(true);
  });

  it("zeigt Toast bei fetch-Fehler und setzt isLoading/isPlaying false", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("err", { status: 500 }) as unknown as Response,
    );

    const { result } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    expect(toastErrorMock).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("AbortController (Codex NACHBESSERN F4): zweiter play() abortet in-flight fetch des ersten", async () => {
    // Erster fetch: pending — wartet auf abort
    let firstAbortSignal: AbortSignal | undefined;
    const firstFetch = new Promise<Response>((_, reject) => {
      // wird via signal abortieren
      const checkAbort = () => {
        if (firstAbortSignal?.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        }
      };
      // poll
      const interval = setInterval(() => {
        if (firstAbortSignal?.aborted) {
          clearInterval(interval);
          checkAbort();
        }
      }, 5);
    });

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init?: RequestInit) => {
        callCount += 1;
        if (callCount === 1) {
          firstAbortSignal = init?.signal ?? undefined;
          return firstFetch;
        }
        // Zweiter Call: liefert sofort
        return Promise.resolve(
          new Response(new Blob(["b"], { type: "audio/mpeg" }), {
            status: 200,
          }) as unknown as Response,
        );
      },
    );

    const { result } = renderHook(() => useTtsPlayback());

    // play("Erste") starten — fetch haengt
    act(() => {
      void result.current.play("Erste");
    });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(firstAbortSignal).toBeDefined();
    expect(firstAbortSignal?.aborted).toBe(false);

    // play("Zweite") — sollte abort signal des ersten setzen
    await act(async () => {
      await result.current.play("Zweite");
    });

    expect(firstAbortSignal?.aborted).toBe(true);
    // Nur eine Audio-Instanz wurde erstellt (fuer "Zweite")
    expect(MockAudio.lastInstance).not.toBeNull();
  });

  it("Lazy-Sync (Codex ZUSATZ-FUND C): laedt voice_preferences aus Supabase wenn localStorage leer", async () => {
    // localStorage leeren
    localStorage.removeItem("quartier-voice-prefs-synced");

    // Supabase-Mock vorbereiten — minimale chain fuer .from().select().eq().single()
    const singleMock = vi.fn().mockResolvedValue({
      data: { voice_preferences: { voice: "ash", speed: 0.85 } },
      error: null,
    });
    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: singleMock,
          }),
        }),
      }),
    };
    vi.doMock("@/lib/supabase/client", () => ({
      createClient: () => supabaseMock,
    }));

    // Hook mounten — triggert den Sync-Effekt
    const { useTtsPlayback: useTtsFresh } =
      await import("@/modules/voice/hooks/useTtsPlayback");
    renderHook(() => useTtsFresh());

    // Async: warte bis Supabase-Call durch ist und localStorage gefuellt
    await waitFor(() => {
      const stored = localStorage.getItem("quartier-voice-prefs-synced");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.voice).toBe("ash");
      expect(parsed.speed).toBe(0.85);
    });
  });

  it("Unmount stoppt laufendes Audio", async () => {
    mockTtsFetch();
    const { result, unmount } = renderHook(() => useTtsPlayback());

    await act(async () => {
      await result.current.play("Test");
    });

    const audio = MockAudio.lastInstance;
    expect(audio?.paused).toBe(false);

    unmount();

    expect(audio?.paused).toBe(true);
  });
});
