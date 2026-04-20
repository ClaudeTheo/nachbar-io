// __tests__/modules/memory/useMemoryFacts.test.tsx
// Welle C C8 — Tests fuer useMemoryFacts-Hook mit Caregiver-Cross-Read-Param.
//
// Abdeckung:
//  - ohne subjectUserId: /api/memory/facts + /api/memory/consent (wie bisher)
//  - mit subjectUserId: /api/memory/facts?subject_user_id=... (Caregiver-Pfad)
//  - mit subjectUserId: KEIN Consent-Fetch (Caregiver zeigt keine Senior-Consents)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useMemoryFacts } from "@/modules/memory/hooks/useMemoryFacts";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

function mockJsonFetch(
  responseMap: Record<string, { success: boolean; data: unknown }>,
) {
  const mock = vi.fn(async (url: string) => {
    const match = Object.entries(responseMap).find(([key]) =>
      url.includes(key),
    );
    const body = match ? match[1] : { success: true, data: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe("useMemoryFacts", () => {
  it("ohne subjectUserId: laedt facts + consents parallel", async () => {
    const fetchMock = mockJsonFetch({
      "/api/memory/facts": {
        success: true,
        data: [{ id: "f1", category: "profile", key: "name", value: "Anna" }],
      },
      "/api/memory/consent": {
        success: true,
        data: [{ consent_type: "memory_basis", granted: true }],
      },
    });

    const { result } = renderHook(() => useMemoryFacts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.facts).toHaveLength(1);
    expect(result.current.consents).toHaveLength(1);
    // Genau zwei Calls: facts + consent
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // URL enthaelt keinen subject_user_id-Param
    const factsCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("/api/memory/facts"),
    );
    expect(String(factsCall?.[0])).not.toContain("subject_user_id");
  });

  it("mit subjectUserId: baut URL mit ?subject_user_id= und skippt Consent-Fetch", async () => {
    const fetchMock = mockJsonFetch({
      "/api/memory/facts": {
        success: true,
        data: [
          {
            id: "f2",
            category: "profile",
            key: "lieblingsessen",
            value: "Apfelstrudel",
            source: "caregiver",
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      useMemoryFacts({ subjectUserId: "senior-42" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.facts).toHaveLength(1);
    // Nur facts, keine consents
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callUrl = String(fetchMock.mock.calls[0][0]);
    expect(callUrl).toContain("/api/memory/facts");
    expect(callUrl).toContain("subject_user_id=senior-42");
    // Consents bleiben leer
    expect(result.current.consents).toEqual([]);
  });
});
