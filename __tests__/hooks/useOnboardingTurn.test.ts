// __tests__/hooks/useOnboardingTurn.test.ts
// Welle C C6 — Client-Hook fuer den Onboarding-Wizard.
//
// Spricht POST /api/ai/onboarding/turn an (C5b). Haelt die Conversation-History
// client-seitig (stateless Route). Fuer mode="confirm" Tool-Results sammelt der
// Hook die offenen Confirmations und stellt confirm/dismiss Methoden bereit,
// die /api/memory/facts (Confirm) bzw. nichts (Dismiss) ansprechen.

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useOnboardingTurn } from "@/modules/voice/hooks/useOnboardingTurn";

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  }) as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    jsonResponse({
      assistant_text: "Hallo, freut mich.",
      tool_results: [],
      stop_reason: "end_turn",
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useOnboardingTurn", () => {
  it("startet mit leerer History, isLoading=false, keinen Confirmations", () => {
    const { result } = renderHook(() => useOnboardingTurn());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingConfirmations).toEqual([]);
  });

  it("sendUserInput POSTet /api/ai/onboarding/turn mit messages+userInput", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch") as unknown as ReturnType<
      typeof vi.fn
    >;
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Mein Name ist Anna.");
    });

    const aiCall = fetchSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "/api/ai/onboarding/turn",
    );
    expect(aiCall).toBeDefined();
    const init = aiCall![1] as RequestInit;
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([]); // erste Anfrage, leere History
    expect(body.userInput).toBe("Mein Name ist Anna.");
  });

  it("appendet user + assistant Message NACH erfolgreicher Response", async () => {
    const { result } = renderHook(() => useOnboardingTurn());

    expect(result.current.messages).toHaveLength(0);

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    expect(result.current.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hallo, freut mich." },
    ]);
  });

  it("appendet KEINE assistant-Message wenn assistant_text leer ist (tool-only)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        assistant_text: "",
        tool_results: [
          {
            ok: true,
            mode: "save",
            factId: "abc",
            category: "preference",
            key: "tee",
          },
        ],
        stop_reason: "tool_use",
      }),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Ich trinke Tee.");
    });

    // Nur der user-Input ist in der History — keine leere Assistant-Bubble
    expect(result.current.messages).toEqual([
      { role: "user", content: "Ich trinke Tee." },
    ]);
  });

  it("appendet KEINE assistant-Message wenn assistant_text nur whitespace ist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        assistant_text: "   \n  ",
        tool_results: [],
        stop_reason: "end_turn",
      }),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    expect(result.current.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("zweiter sendUserInput schickt vorherige History mit", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch") as unknown as ReturnType<
      typeof vi.fn
    >;
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });
    await act(async () => {
      await result.current.sendUserInput("Wie geht es dir?");
    });

    const calls = fetchSpy.mock.calls.filter(
      (c: unknown[]) => c[0] === "/api/ai/onboarding/turn",
    );
    expect(calls).toHaveLength(2);
    const secondBody = JSON.parse((calls[1][1] as RequestInit).body as string);
    expect(secondBody.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hallo, freut mich." },
    ]);
    expect(secondBody.userInput).toBe("Wie geht es dir?");
  });

  it("setzt isLoading=true waehrend Request, false danach", async () => {
    let resolveFetch: ((v: Response) => void) | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((r) => {
          resolveFetch = r;
        }),
    );

    const { result } = renderHook(() => useOnboardingTurn());

    let p: Promise<void> | undefined;
    act(() => {
      p = result.current.sendUserInput("Hi");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolveFetch!(
        jsonResponse({
          assistant_text: "Ok",
          tool_results: [],
          stop_reason: "end_turn",
        }),
      );
      await p;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("ignoriert leeren oder whitespace-userInput (kein fetch)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch") as unknown as ReturnType<
      typeof vi.fn
    >;
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("");
    });
    await act(async () => {
      await result.current.sendUserInput("   ");
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("setzt error='ai_disabled' bei 503", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "KI ist deaktiviert" }, 503),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    expect(result.current.error).toBe("ai_disabled");
    expect(result.current.messages).toEqual([]); // bei Fehler KEIN history-append
  });

  it("setzt error='unauthorized' bei 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Nicht authentifiziert" }, 401),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    expect(result.current.error).toBe("unauthorized");
  });

  it("setzt error='generic' bei 500 + zeigt Toast", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: "Internal" }, 500),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    expect(result.current.error).toBe("generic");
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it("sammelt tool_results mit mode='confirm' in pendingConfirmations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        assistant_text: "Soll ich das speichern?",
        tool_results: [
          {
            ok: true,
            mode: "confirm",
            factId: null,
            category: "personal",
            key: "geburtstag",
            value: "1942-03-12",
          },
          {
            ok: true,
            mode: "save",
            factId: "abc",
            category: "preference",
            key: "tee",
          },
        ],
        stop_reason: "end_turn",
      }),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Ich bin am 12. Maerz 1942 geboren.");
    });

    expect(result.current.pendingConfirmations).toHaveLength(1);
    expect(result.current.pendingConfirmations[0]).toMatchObject({
      mode: "confirm",
      category: "personal",
      key: "geburtstag",
      value: "1942-03-12",
    });
  });

  it("confirmMemory POSTet /api/memory/facts und entfernt aus pendingConfirmations", async () => {
    // Erst: Turn mit Confirm-Result
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u === "/api/ai/onboarding/turn") {
        return jsonResponse({
          assistant_text: "Soll ich speichern?",
          tool_results: [
            {
              ok: true,
              mode: "confirm",
              factId: null,
              category: "personal",
              key: "geburtstag",
              value: "1942-03-12",
            },
          ],
          stop_reason: "end_turn",
        });
      }
      if (u === "/api/memory/facts") {
        return jsonResponse({
          success: true,
          data: { id: "fact-1" },
          error: null,
        });
      }
      return jsonResponse({}, 404);
    });

    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Ich bin am 12. Maerz 1942 geboren.");
    });

    expect(result.current.pendingConfirmations).toHaveLength(1);
    const item = result.current.pendingConfirmations[0];

    await act(async () => {
      await result.current.confirmMemory(item);
    });

    expect(result.current.pendingConfirmations).toHaveLength(0);
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("dismissConfirmation entfernt NUR das uebergebene item (reference-equality, auch bei gleichem key)", async () => {
    // Zwei Confirmations mit IDENTISCHER category+key, aber unterschiedlichem value.
    // Mit category+key-Filter wuerde dismiss BEIDE entfernen — Codex-Review
    // ZUSATZ-FUND D. Mit reference-equality nur das angegebene.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        assistant_text: "Soll ich beides speichern?",
        tool_results: [
          {
            ok: true,
            mode: "confirm",
            factId: null,
            category: "preference",
            key: "tee",
            value: "Schwarztee",
          },
          {
            ok: true,
            mode: "confirm",
            factId: null,
            category: "preference",
            key: "tee",
            value: "Pfefferminz",
          },
        ],
        stop_reason: "end_turn",
      }),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Ich mag verschiedene Tees.");
    });

    expect(result.current.pendingConfirmations).toHaveLength(2);
    const first = result.current.pendingConfirmations[0];

    act(() => {
      result.current.dismissConfirmation(first);
    });

    expect(result.current.pendingConfirmations).toHaveLength(1);
    expect(result.current.pendingConfirmations[0].value).toBe("Pfefferminz");
  });

  it("dismissConfirmation entfernt aus pendingConfirmations OHNE fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        assistant_text: "Soll ich speichern?",
        tool_results: [
          {
            ok: true,
            mode: "confirm",
            factId: null,
            category: "personal",
            key: "geburtstag",
            value: "1942-03-12",
          },
        ],
        stop_reason: "end_turn",
      }),
    );
    const { result } = renderHook(() => useOnboardingTurn());

    await act(async () => {
      await result.current.sendUserInput("Hi");
    });

    const item = result.current.pendingConfirmations[0];
    const fetchSpy = vi.spyOn(globalThis, "fetch") as unknown as ReturnType<
      typeof vi.fn
    >;
    fetchSpy.mockClear();

    act(() => {
      result.current.dismissConfirmation(item);
    });

    expect(result.current.pendingConfirmations).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reset() leert messages + pendingConfirmations + error", async () => {
    const { result } = renderHook(() => useOnboardingTurn());
    await act(async () => {
      await result.current.sendUserInput("Hi");
    });
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.pendingConfirmations).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
