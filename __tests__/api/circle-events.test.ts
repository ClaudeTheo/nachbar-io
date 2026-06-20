// __tests__/api/circle-events.test.ts
// Welle F3 (Befund C2:5): POST /api/circle-events — Angehoeriger legt einen
// Termin fuer den Bewohner an (residentId). Defense-in-Depth: ohne aktiven
// caregiver_link -> 403 (statt RLS-bedingtem 500). Selbst-Pfad bleibt erhalten.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();
const createCircleEventMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/services/circle-events.service", () => ({
  createCircleEvent: (...args: unknown[]) => createCircleEventMock(...args),
}));

const CAREGIVER = "caregiver-1";
const SENIOR = "senior-9";

function makePost(body: unknown): NextRequest {
  return new Request("http://localhost/api/circle-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/circle-events (F3 / C2:5)", () => {
  beforeEach(() => {
    mockSupabase.reset();
    createCircleEventMock.mockReset();
    createCircleEventMock.mockResolvedValue({ id: "ev-1" });
  });

  it("gibt 401 ohne Login zurueck", async () => {
    const { POST } = await import("@/app/api/circle-events/route");
    const res = await POST(
      makePost({ title: "X", scheduledAt: "2026-07-01T10:00" }),
    );
    expect(res.status).toBe(401);
    expect(createCircleEventMock).not.toHaveBeenCalled();
  });

  it("Selbst-Pfad (kein residentId): legt mit residentId = user.id an", async () => {
    mockSupabase.setUser({ id: SENIOR });
    const { POST } = await import("@/app/api/circle-events/route");
    const res = await POST(
      makePost({ title: "Arzt", scheduledAt: "2026-07-01T10:00", whoComes: "" }),
    );
    expect(res.status).toBe(200);
    expect(createCircleEventMock).toHaveBeenCalledWith(
      expect.anything(),
      SENIOR,
      expect.objectContaining({ residentId: SENIOR }),
    );
  });

  it("Caregiver-Pfad mit aktivem Link: legt fuer den Bewohner an (created_by = caregiver)", async () => {
    mockSupabase.setUser({ id: CAREGIVER });
    mockSupabase.addResponse("caregiver_links", {
      data: { id: "link-1" },
      error: null,
    });
    const { POST } = await import("@/app/api/circle-events/route");
    const res = await POST(
      makePost({
        residentId: SENIOR,
        title: "Besuch",
        scheduledAt: "2026-07-01T10:00",
        whoComes: "Maria",
      }),
    );
    expect(res.status).toBe(200);
    expect(createCircleEventMock).toHaveBeenCalledWith(
      expect.anything(),
      CAREGIVER,
      expect.objectContaining({ residentId: SENIOR }),
    );
  });

  it("Caregiver-Pfad ohne aktiven Link: 403, kein Insert", async () => {
    mockSupabase.setUser({ id: CAREGIVER });
    mockSupabase.addResponse("caregiver_links", { data: null, error: null });
    const { POST } = await import("@/app/api/circle-events/route");
    const res = await POST(
      makePost({
        residentId: SENIOR,
        title: "Besuch",
        scheduledAt: "2026-07-01T10:00",
      }),
    );
    expect(res.status).toBe(403);
    expect(createCircleEventMock).not.toHaveBeenCalled();
  });
});
