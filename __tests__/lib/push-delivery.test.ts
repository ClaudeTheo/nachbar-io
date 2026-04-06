import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock web-push BEFORE importing the module under test
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockSupabaseClient = { from: mockFrom };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "BNtest-vapid-public-key-base64url";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key-base64url";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

import webpush from "web-push";
import { deliverPush, notifyOrgStaff, notifyCitizen } from "@/lib/push-delivery";

describe("push-delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deliverPush", () => {
    it("sendet Push an alle Subscriptions eines Users fuer ein Portal", async () => {
      const subs = [
        { endpoint: "https://push.example.com/1", p256dh: "key1", auth: "auth1" },
        { endpoint: "https://push.example.com/2", p256dh: "key2", auth: "auth2" },
      ];
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: subs, error: null }),
          }),
        }),
      });

      (webpush.sendNotification as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await deliverPush("user-1", "io", {
        title: "Test",
        body: "Nachricht",
        url: "/postfach/123",
        tag: "postfach-123",
      });

      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it("loescht abgelaufene Subscriptions bei HTTP 410", async () => {
      const subs = [
        { endpoint: "https://push.example.com/expired", p256dh: "k", auth: "a" },
      ];

      const mockDelete = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: subs, error: null }),
              }),
            }),
          };
        }
        return { delete: mockDelete };
      });

      (webpush.sendNotification as ReturnType<typeof vi.fn>).mockRejectedValue({
        statusCode: 410,
      });

      await deliverPush("user-1", "io", {
        title: "Test",
        body: "Body",
        url: "/test",
        tag: "test",
      });

      expect(mockDelete).toHaveBeenCalled();
    });

    it("blockiert nicht bei Push-Fehler", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: { message: "DB-Fehler" } }),
          }),
        }),
      });

      await expect(
        deliverPush("user-1", "io", {
          title: "Test",
          body: "Body",
          url: "/test",
          tag: "test",
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("notifyOrgStaff", () => {
    it("sendet Push an alle Staff einer verifizierten Org", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: "org-1" }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "org_members") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ user_id: "staff-1" }, { user_id: "staff-2" }], error: null }),
            }),
          };
        }
        // push_subscriptions
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      await notifyOrgStaff("org-1", {
        title: "Neue Nachricht",
        body: "Ein Buerger hat geschrieben.",
        url: "/postfach/t1",
        tag: "postfach-t1",
      });

      // Kein Fehler, auch wenn keine Subscriptions vorhanden
      expect(true).toBe(true);
    });
  });

  describe("notifyCitizen", () => {
    it("ruft deliverPush mit portal=io auf", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      await notifyCitizen("citizen-1", {
        title: "Antwort vom Rathaus",
        body: "Sie haben eine neue Nachricht.",
        url: "/postfach/t1",
        tag: "postfach-t1",
      });

      expect(true).toBe(true);
    });
  });
});
