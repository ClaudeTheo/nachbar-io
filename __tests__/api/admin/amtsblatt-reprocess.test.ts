// __tests__/api/admin/amtsblatt-reprocess.test.ts
// Welle K2 — Manueller Re-Trigger fuer einzelne Amtsblatt-Issues.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const fromMock = vi.fn();
const supabaseMock = {
  auth: { getUser: getUserMock },
  from: fromMock,
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock,
}));

const adminClientMock = { _admin: true };
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => adminClientMock,
}));

const reprocessMock = vi.fn();
vi.mock("@/lib/services/amtsblatt-sync.service", () => ({
  reprocessAmtsblattIssue: (...args: unknown[]) => reprocessMock(...args),
}));

beforeEach(() => {
  getUserMock.mockReset();
  fromMock.mockReset();
  reprocessMock.mockReset();

  getUserMock.mockResolvedValue({
    data: { user: { id: "u-admin" } },
    error: null,
  });
  fromMock.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { is_admin: true }, error: null }),
      }),
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function callPost(body: unknown): Promise<Response> {
  const { POST } = await import(
    "@/app/api/admin/amtsblatt/reprocess/route"
  );
  const req = new Request(
    "http://localhost/api/admin/amtsblatt/reprocess",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
  );
  return POST(req);
}

describe("POST /api/admin/amtsblatt/reprocess", () => {
  it("returns 401 wenn nicht angemeldet", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await callPost({ issueId: "x" });
    expect(res.status).toBe(401);
  });

  it("returns 403 wenn nicht admin", async () => {
    fromMock.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { is_admin: false }, error: null }),
        }),
      }),
    });
    const res = await callPost({ issueId: "x" });
    expect(res.status).toBe(403);
  });

  it("returns 400 wenn issueId fehlt oder leer", async () => {
    const res = await callPost({});
    expect(res.status).toBe(400);
    const res2 = await callPost({ issueId: "" });
    expect(res2.status).toBe(400);
  });

  it("ruft reprocessAmtsblattIssue mit Admin-Client + issueId und returns Resultat", async () => {
    reprocessMock.mockResolvedValueOnce({
      message: "Reprocessed",
      issue_id: "iss-1",
      announcements_imported: 80,
      status: "done",
      error_message: null,
    });
    const res = await callPost({ issueId: "iss-1" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.announcements_imported).toBe(80);
    expect(json.status).toBe("done");
    expect(reprocessMock).toHaveBeenCalledWith(adminClientMock, "iss-1");
  });

  it("returns 500 bei Service-Throw", async () => {
    reprocessMock.mockRejectedValueOnce(new Error("PDF unreachable"));
    const res = await callPost({ issueId: "iss-1" });
    expect(res.status).toBe(500);
  });
});
