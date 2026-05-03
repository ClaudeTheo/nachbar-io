import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mockGetCareNotificationRecipients = vi.fn();
const mockSendCareNotification = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/care/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/care/notifications", () => ({
  getCareNotificationRecipients: (...args: unknown[]) =>
    mockGetCareNotificationRecipients(...args),
  sendCareNotification: (...args: unknown[]) => mockSendCareNotification(...args),
}));

vi.mock("@/lib/care/cron-heartbeat", () => ({
  writeCronHeartbeat: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/quarters/helpers", () => ({
  getUserQuarterId: vi.fn().mockResolvedValue("quarter-1"),
}));

vi.mock("@/lib/care/field-encryption", () => ({
  encryptField: vi.fn((value: string | null) => (value ? `enc:${value}` : null)),
}));

import { runCheckinCron } from "./cron-checkin.service";

interface MockResponse {
  data: unknown;
  error: unknown;
}

function createSupabaseMock() {
  const responses = new Map<string, MockResponse[]>();

  function addResponse(table: string, response: MockResponse) {
    if (!responses.has(table)) responses.set(table, []);
    responses.get(table)!.push(response);
  }

  function consume(table: string): MockResponse {
    return responses.get(table)?.shift() ?? { data: null, error: null };
  }

  const supabase = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockImplementation(() => Promise.resolve(consume(table)));
      chain.maybeSingle = vi
        .fn()
        .mockImplementation(() => Promise.resolve(consume(table)));
      chain.then = (
        resolve: (value: MockResponse) => void,
        reject?: (reason: unknown) => void,
      ) => Promise.resolve(consume(table)).then(resolve, reject);
      return chain;
    }),
  } as unknown as SupabaseClient;

  return { supabase, addResponse };
}

describe("runCheckinCron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T13:01:00"));
    vi.clearAllMocks();
    mockGetCareNotificationRecipients.mockResolvedValue([
      { userId: "link-relative-1", role: "relative", source: "caregiver_links" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("benachrichtigt CareCircle-Empfaenger bei verpasstem Check-in", async () => {
    const { supabase, addResponse } = createSupabaseMock();

    addResponse("care_profiles", {
      data: [{ user_id: "senior-1", checkin_times: ["12:00"] }],
      error: null,
    });
    addResponse("care_checkins", {
      data: { id: "checkin-1", completed_at: null, escalated: false },
      error: null,
    });
    addResponse("care_checkins", { data: null, error: null });
    addResponse("care_sos_alerts", { data: { id: "sos-1" }, error: null });

    const result = await runCheckinCron(supabase);

    expect(result.escalated).toBe(1);
    expect(mockGetCareNotificationRecipients).toHaveBeenCalledWith(supabase, {
      seniorId: "senior-1",
      roles: ["relative", "care_service"],
    });
    expect(mockSendCareNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        userId: "link-relative-1",
        type: "care_checkin_missed",
        channels: ["push", "sms", "in_app"],
        enableFallback: true,
      }),
    );
  });
});
