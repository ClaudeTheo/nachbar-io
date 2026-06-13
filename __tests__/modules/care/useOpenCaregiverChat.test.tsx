// __tests__/modules/care/useOpenCaregiverChat.test.tsx
// Welle S2 (C2:1): Der Hook loest die Konversation mit einem Angehoerigen auf
// und navigiert nach /chat/{id} — statt auf einen toten /messages/{userId}-Link.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import {
  useOpenCaregiverChat,
  useOpenResidentChat,
} from "@/modules/care/hooks/useOpenCaregiverChat";

const fetchMock = vi.fn();

beforeEach(() => {
  push.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useOpenCaregiverChat (S2/C2:1)", () => {
  it("loest die Konversation auf und navigiert nach /chat/{conversationId}", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ conversation_id: "conv-7" }), {
        status: 200,
      }),
    );
    const { result } = renderHook(() => useOpenCaregiverChat());

    await act(async () => {
      await result.current.openChat("cg-1");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/care/contact/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ caregiver_id: "cg-1" });
    expect(push).toHaveBeenCalledWith("/chat/conv-7");
    expect(result.current.error).toBeNull();
  });

  it("zeigt die Fehlermeldung bei 403 (keine aktive Verknuepfung) und navigiert NICHT", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Keine aktive Verknüpfung mit diesem Angehörigen",
        }),
        { status: 403 },
      ),
    );
    const { result } = renderHook(() => useOpenCaregiverChat());

    await act(async () => {
      await result.current.openChat("cg-x");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/keine aktive verkn/i);
    expect(result.current.pendingId).toBeNull();
  });

  it("faengt Netzwerkfehler ab (keine Navigation, klare Meldung)", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useOpenCaregiverChat());

    await act(async () => {
      await result.current.openChat("cg-2");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/nicht geöffnet/i);
  });

  it("setzt pendingId nach erfolgreicher Navigation zurueck", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ conversation_id: "conv-1" }), {
        status: 200,
      }),
    );
    const { result } = renderHook(() => useOpenCaregiverChat());

    await act(async () => {
      await result.current.openChat("cg-1");
    });

    // Sonst bliebe der Button dauerhaft disabled, wenn /chat den Nutzer zurueckwirft.
    expect(result.current.pendingId).toBeNull();
  });
});

describe("useOpenResidentChat (S2/C2:1, Angehoeriger -> Bewohner)", () => {
  it("nutzt den Caregiver-Endpoint mit resident_id und navigiert nach /chat/{id}", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ conversation_id: "conv-5" }), {
        status: 200,
      }),
    );
    const { result } = renderHook(() => useOpenResidentChat());

    await act(async () => {
      await result.current.openChat("res-1");
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/caregiver/chat");
    expect(JSON.parse(init.body)).toEqual({ resident_id: "res-1" });
    expect(push).toHaveBeenCalledWith("/chat/conv-5");
  });

  it("zeigt die Abo-/Berechtigungs-Fehlermeldung des Endpoints (403)", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Plus-Abo erforderlich" }), {
        status: 403,
      }),
    );
    const { result } = renderHook(() => useOpenResidentChat());

    await act(async () => {
      await result.current.openChat("res-2");
    });

    expect(push).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/plus-abo/i);
  });
});
