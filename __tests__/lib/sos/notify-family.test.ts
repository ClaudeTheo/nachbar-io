import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmergencyContact } from "@/modules/care/services/types";

// --- Mocks ---

const mockGetCareProfile = vi.fn();
vi.mock("@/modules/care/services/profile.service", () => ({
  getCareProfile: (...args: unknown[]) => mockGetCareProfile(...args),
}));

const mockSendSms = vi.fn();
vi.mock("@/modules/care/services/channels/sms", () => ({
  sendSms: (...args: unknown[]) => mockSendSms(...args),
}));

// Import after mocks
import { notifyFamily } from "@/lib/sos/notify-family";

// --- Helpers ---

function makeContact(
  overrides: Partial<EmergencyContact> = {},
): EmergencyContact {
  return {
    name: "Anna Schmidt",
    phone: "+491234567890",
    role: "relative",
    priority: 1,
    relationship: "Tochter",
    ...overrides,
  };
}

function makeFakeSupabase(displayName = "Erna Müller") {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { display_name: displayName },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown;
}

// --- Tests ---

describe("notifyFamily", () => {
  const userId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends SMS to all emergency contacts and returns correct count", async () => {
    const contacts: EmergencyContact[] = [
      makeContact({ name: "Anna", phone: "+491111111111" }),
      makeContact({ name: "Bob", phone: "+492222222222", priority: 2 }),
    ];
    mockGetCareProfile.mockResolvedValue({
      emergency_contacts: contacts,
    });
    mockSendSms.mockResolvedValue(true);

    const supabase = makeFakeSupabase();
    const result = await notifyFamily(supabase as SupabaseClient, userId);

    expect(mockGetCareProfile).toHaveBeenCalledWith(supabase, userId, userId);
    expect(mockSendSms).toHaveBeenCalledTimes(2);

    // Verify message contains senior name
    const firstCall = mockSendSms.mock.calls[0][0];
    expect(firstCall.message).toContain("Erna Müller");
    expect(firstCall.message).toContain("Notfall-Knopf");

    expect(result).toEqual({ notified: 2, failed: 0 });
  });

  it("returns { notified: 0, failed: 0 } when no CareProfile exists", async () => {
    mockGetCareProfile.mockResolvedValue(null);

    const supabase = makeFakeSupabase();
    const result = await notifyFamily(supabase as SupabaseClient, userId);

    expect(result).toEqual({ notified: 0, failed: 0 });
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it("returns { notified: 0, failed: 0 } when emergency_contacts is empty", async () => {
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: [] });

    const supabase = makeFakeSupabase();
    const result = await notifyFamily(supabase as SupabaseClient, userId);

    expect(result).toEqual({ notified: 0, failed: 0 });
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it("counts failed SMS separately", async () => {
    const contacts: EmergencyContact[] = [
      makeContact({ name: "Anna", phone: "+491111111111" }),
      makeContact({ name: "Bob", phone: "+492222222222" }),
    ];
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: contacts });
    mockSendSms.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const supabase = makeFakeSupabase();
    const result = await notifyFamily(supabase as SupabaseClient, userId);

    expect(result).toEqual({ notified: 1, failed: 1 });
  });

  it("skips contacts without phone number", async () => {
    const contacts: EmergencyContact[] = [
      makeContact({ name: "Anna", phone: "" }),
      makeContact({ name: "Bob", phone: "+492222222222" }),
    ];
    mockGetCareProfile.mockResolvedValue({ emergency_contacts: contacts });
    mockSendSms.mockResolvedValue(true);

    const supabase = makeFakeSupabase();
    const result = await notifyFamily(supabase as SupabaseClient, userId);

    expect(mockSendSms).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ notified: 1, failed: 0 });
  });
});
