// __tests__/api/circle-events-delete.test.ts
// Welle F3-Folge (Befund C2:5): DELETE /api/circle-events/[id] — der Ersteller
// (i.d.R. der Angehoerige) markiert einen Termin als erledigt (soft-delete via
// markAsDone -> deleted_at). Scope liegt im Service (.eq created_by) + RLS
// circle_events_update_creator. Kein fremder Termin loeschbar.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

const mockSupabase = createRouteMockSupabase();
const markAsDoneMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/services/circle-events.service", () => ({
  markAsDone: (...args: unknown[]) => markAsDoneMock(...args),
}));

const USER = "caregiver-1";
const EVENT = "ev-123";

function makeDelete(): NextRequest {
  return new Request(`http://localhost/api/circle-events/${EVENT}`, {
    method: "DELETE",
  }) as unknown as NextRequest;
}

function ctx() {
  return { params: Promise.resolve({ id: EVENT }) };
}

describe("DELETE /api/circle-events/[id] (F3-Folge / markAsDone)", () => {
  beforeEach(() => {
    mockSupabase.reset();
    markAsDoneMock.mockReset();
    markAsDoneMock.mockResolvedValue(undefined);
  });

  it("gibt 401 ohne Login zurueck", async () => {
    const { DELETE } = await import("@/app/api/circle-events/[id]/route");
    const res = await DELETE(makeDelete(), ctx());
    expect(res.status).toBe(401);
    expect(markAsDoneMock).not.toHaveBeenCalled();
  });

  it("markiert den Termin als erledigt (created_by-scoped via Service)", async () => {
    mockSupabase.setUser({ id: USER });
    const { DELETE } = await import("@/app/api/circle-events/[id]/route");
    const res = await DELETE(makeDelete(), ctx());
    expect(res.status).toBe(200);
    expect(markAsDoneMock).toHaveBeenCalledWith(
      expect.anything(),
      EVENT,
      USER,
    );
  });

  it("gibt 500 bei einem Service-Fehler zurueck", async () => {
    mockSupabase.setUser({ id: USER });
    markAsDoneMock.mockRejectedValue(new Error("db"));
    const { DELETE } = await import("@/app/api/circle-events/[id]/route");
    const res = await DELETE(makeDelete(), ctx());
    expect(res.status).toBe(500);
  });
});
