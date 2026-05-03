import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFeatureFlagSingle = vi.fn();
const mockCallsCreate = vi.fn();
const mockTwilioClient = vi.fn((_sid: unknown, _token: unknown) => ({
  calls: { create: mockCallsCreate },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockFeatureFlagSingle,
        })),
      })),
    })),
  }),
}));

vi.mock("twilio", () => ({
  default: (sid: unknown, token: unknown) => mockTwilioClient(sid, token),
}));

describe("initiateCall", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = `AC${"1".repeat(32)}`;
    process.env.TWILIO_AUTH_TOKEN = "auth-token-with-more-than-twenty-chars";
    process.env.TWILIO_PHONE_NUMBER = "+4915112345678";
    mockCallsCreate.mockResolvedValue({ sid: "CA123", status: "queued" });
  });

  it("startet keinen Anruf wenn TWILIO_ENABLED serverseitig aus ist", async () => {
    mockFeatureFlagSingle.mockResolvedValueOnce({
      data: { enabled: false },
      error: null,
    });

    const { initiateCall } = await import("./voice");
    const result = await initiateCall({
      phone: "+4915212345678",
      ttsMessage: "Bitte melden.",
    });

    expect(result).toBe(false);
    expect(mockTwilioClient).not.toHaveBeenCalled();
    expect(mockCallsCreate).not.toHaveBeenCalled();
  });

  it("startet Anruf wenn TWILIO_ENABLED aktiv und Twilio konfiguriert ist", async () => {
    mockFeatureFlagSingle.mockResolvedValueOnce({
      data: { enabled: true },
      error: null,
    });

    const { initiateCall } = await import("./voice");
    const result = await initiateCall({
      phone: "+4915212345678",
      ttsMessage: "Bitte melden.",
    });

    expect(result).toBe(true);
    expect(mockCallsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "+4915112345678",
        to: "+4915212345678",
        timeout: 30,
      }),
    );
  });
});
