import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

// Welle SB-4: POST /api/senior/reminders/[id]/acknowledge — duenne Route.
// Auth (401) + ID-Validierung (400) + Delegation an acknowledgeSeniorReminder.

const mockSupabase = createRouteMockSupabase();
const acknowledgeSeniorReminderMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({})),
}));

vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  acknowledgeSeniorReminder: (...args: unknown[]) =>
    acknowledgeSeniorReminderMock(...args),
}));

const VALID = "11111111-1111-1111-1111-111111111111";

function makePost(id: string): NextRequest {
  return new Request(
    `http://localhost/api/senior/reminders/${id}/acknowledge`,
    { method: "POST" },
  ) as unknown as NextRequest;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/senior/reminders/[id]/acknowledge", () => {
  beforeEach(() => {
    mockSupabase.reset();
    acknowledgeSeniorReminderMock.mockReset();
  });

  it("gibt 401 ohne Login zurueck", async () => {
    const { POST } = await import(
      "@/app/api/senior/reminders/[id]/acknowledge/route"
    );
    const res = await POST(makePost(VALID), ctx(VALID));
    expect(res.status).toBe(401);
    expect(acknowledgeSeniorReminderMock).not.toHaveBeenCalled();
  });

  it("gibt 400 bei ungueltiger ID zurueck", async () => {
    mockSupabase.setUser({ id: "u-senior" });
    const { POST } = await import(
      "@/app/api/senior/reminders/[id]/acknowledge/route"
    );
    const res = await POST(makePost("not-a-uuid"), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(acknowledgeSeniorReminderMock).not.toHaveBeenCalled();
  });

  it("delegiert an den Service und gibt dessen Ergebnis zurueck", async () => {
    mockSupabase.setUser({ id: "u-senior" });
    acknowledgeSeniorReminderMock.mockResolvedValue({ acknowledged: true });
    const { POST } = await import(
      "@/app/api/senior/reminders/[id]/acknowledge/route"
    );
    const res = await POST(makePost(VALID), ctx(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ acknowledged: true });
    expect(acknowledgeSeniorReminderMock).toHaveBeenCalledWith(
      expect.anything(),
      "u-senior",
      VALID,
    );
  });
});
