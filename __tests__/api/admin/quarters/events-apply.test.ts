// __tests__/api/admin/quarters/events-apply.test.ts
// Welle W10-Persist — POST /api/admin/quarters/[id]/events/apply

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Module-Mocks ---

const getUserMock = vi.fn();
const fromMock = vi.fn();
const supabaseMock = {
  auth: { getUser: getUserMock },
  from: fromMock,
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ /* admin placeholder */ }),
}));

const applyMock = vi.fn();
vi.mock("@/modules/events/services/event-feed-apply.service", () => ({
  applyCrawledEventsForQuarter: (...args: unknown[]) => applyMock(...args),
}));

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
  applyMock.mockReset();

  getUserMock.mockResolvedValue({
    data: { user: { id: "u-admin" } },
    error: null,
  });
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { role: "super_admin" }, error: null }),
      }),
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import(
    "@/app/api/admin/quarters/[id]/events/apply/route"
  );
  const req = new Request(
    "http://localhost/api/admin/quarters/q-1/events/apply",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );
  return POST(req, { params: Promise.resolve({ id: "q-1" }) });
}

describe("POST /api/admin/quarters/[id]/events/apply", () => {
  it("returns 401 wenn nicht angemeldet", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await callPost({ events: [] });
    expect(res.status).toBe(401);
  });

  it("returns 403 wenn nicht super_admin", async () => {
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: "resident" }, error: null }),
        }),
      }),
    });
    const res = await callPost({ events: [] });
    expect(res.status).toBe(403);
  });

  it("returns 400 wenn events kein Array", async () => {
    const res = await callPost({ events: "not-array" });
    expect(res.status).toBe(400);
  });

  it("returns 200 mit savedCount nach Apply", async () => {
    applyMock.mockResolvedValueOnce({
      savedCount: 3,
      syncedAt: "2026-05-10T10:00:00Z",
    });
    const res = await callPost({
      events: [
        { source: "ical", feedUrl: "x", uid: "1", title: "A", description: null, location: null, startDate: "2026-06-01", endDate: null, link: null, isAllDay: true },
      ],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.savedCount).toBe(3);
    expect(json.syncedAt).toBe("2026-05-10T10:00:00Z");
    expect(applyMock).toHaveBeenCalledTimes(1);
  });

  it("returns 500 mit Service-Error wenn Service throws", async () => {
    applyMock.mockRejectedValueOnce(new Error("RLS denied"));
    const res = await callPost({ events: [] });
    expect(res.status).toBe(500);
  });
});
