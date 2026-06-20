import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeAuditLog } from "@/lib/care/audit";
import { createRouteMockSupabase } from "../__tests__/mock-supabase";
import { updateAutoAnswerSettings } from "./caregiver-misc.service";

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function flattenedCalls(mock: ReturnType<typeof createRouteMockSupabase>) {
  return mock.fromCalls.flatMap((entry) => entry.args);
}

describe("updateAutoAnswerSettings", () => {
  let authDb: ReturnType<typeof createRouteMockSupabase>;
  let adminDb: ReturnType<typeof createRouteMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    authDb = createRouteMockSupabase();
    adminDb = createRouteMockSupabase();
  });

  it("prueft Link-Ownership mit dem Auth-Client und schreibt nur auto_answer_* per Admin-Client", async () => {
    authDb.addResponse("caregiver_links", {
      data: { id: "link-1", resident_id: "resident-1" },
      error: null,
    });
    adminDb.addResponse("caregiver_links", {
      data: { id: "link-1" },
      error: null,
    });

    const result = await updateAutoAnswerSettings(
      authDb.supabase,
      adminDb.supabase,
      "caregiver-1",
      {
        linkId: "link-1",
        autoAnswerAllowed: true,
        autoAnswerStart: "08:00",
        autoAnswerEnd: "20:00",
      },
    );

    expect(result).toEqual({ ok: true });

    const authCalls = flattenedCalls(authDb);
    expect(authCalls).toContainEqual(["select", "id, resident_id"]);
    expect(authCalls).toContainEqual(["eq", "id", "link-1"]);
    expect(authCalls).toContainEqual(["eq", "caregiver_id", "caregiver-1"]);
    expect(authCalls).toContainEqual(["is", "revoked_at", null]);
    expect(authCalls.some(([method]) => method === "update")).toBe(false);

    const adminCalls = flattenedCalls(adminDb);
    const updateCall = adminCalls.find(([method]) => method === "update");
    expect(updateCall).toBeDefined();
    expect(updateCall?.[1]).toEqual({
      auto_answer_allowed: true,
      auto_answer_start: "08:00",
      auto_answer_end: "20:00",
    });
    expect(Object.keys(updateCall?.[1] as Record<string, unknown>).sort()).toEqual([
      "auto_answer_allowed",
      "auto_answer_end",
      "auto_answer_start",
    ]);
    expect(adminCalls).toContainEqual(["eq", "id", "link-1"]);
    expect(adminCalls).toContainEqual(["eq", "caregiver_id", "caregiver-1"]);
    expect(adminCalls).toContainEqual(["is", "revoked_at", null]);
    expect(writeAuditLog).toHaveBeenCalledWith(adminDb.supabase, {
      seniorId: "resident-1",
      actorId: "caregiver-1",
      eventType: "auto_answer_settings_changed",
      referenceType: "caregiver_link",
      referenceId: "link-1",
      metadata: {
        changedFields: [
          "auto_answer_allowed",
          "auto_answer_start",
          "auto_answer_end",
        ],
      },
    });
  });

  it("blockiert fremde oder widerrufene Links vor dem Admin-Update", async () => {
    authDb.addResponse("caregiver_links", {
      data: null,
      error: null,
    });

    await expect(
      updateAutoAnswerSettings(authDb.supabase, adminDb.supabase, "caregiver-1", {
        linkId: "foreign-or-revoked-link",
        autoAnswerAllowed: false,
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "link_not_found",
    });

    expect(flattenedCalls(authDb)).toContainEqual(["is", "revoked_at", null]);
    expect(adminDb.fromFn).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});
