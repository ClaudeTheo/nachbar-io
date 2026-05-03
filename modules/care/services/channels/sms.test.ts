import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFeatureFlagSingle = vi.fn();
const mockMessagesCreate = vi.fn();
const mockTwilioClient = vi.fn((_sid: unknown, _token: unknown) => ({
  messages: { create: mockMessagesCreate },
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

describe("sendSms", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.TWILIO_ACCOUNT_SID = `AC${"1".repeat(32)}`;
    process.env.TWILIO_AUTH_TOKEN = "auth-token-with-more-than-twenty-chars";
    process.env.TWILIO_PHONE_NUMBER = "+4915112345678";
    mockMessagesCreate.mockResolvedValue({ sid: "SM123", status: "queued" });
  });

  it("sendet keine SMS wenn TWILIO_ENABLED serverseitig aus ist", async () => {
    mockFeatureFlagSingle.mockResolvedValueOnce({
      data: { enabled: false },
      error: null,
    });

    const { sendSms } = await import("./sms");
    const result = await sendSms({
      phone: "+4915212345678",
      message: "Testnachricht",
    });

    expect(result).toBe(false);
    expect(mockTwilioClient).not.toHaveBeenCalled();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("sendet SMS wenn TWILIO_ENABLED aktiv und Twilio konfiguriert ist", async () => {
    mockFeatureFlagSingle.mockResolvedValueOnce({
      data: { enabled: true },
      error: null,
    });

    const { sendSms } = await import("./sms");
    const result = await sendSms({
      phone: "+4915212345678",
      message: "Testnachricht",
    });

    expect(result).toBe(true);
    expect(mockMessagesCreate).toHaveBeenCalledWith({
      body: "Testnachricht",
      from: "+4915112345678",
      to: "+4915212345678",
    });
  });
});
