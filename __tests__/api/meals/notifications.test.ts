import { describe, it, expect, vi, beforeEach } from "vitest";

// Notification calls tracker
const notificationCalls: Array<{ user_id: string; title: string; type: string }> = [];

vi.mock("@/lib/notifications-server", () => ({
  safeInsertNotification: vi.fn((_client: unknown, params: { user_id: string; title: string; type: string }) => {
    notificationCalls.push(params);
    return Promise.resolve({ success: true, usedFallback: false });
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({}),
}));

const state = {
  meal: { id: "meal-1", servings: 3, status: "active", user_id: "u-host", title: "Lasagne" } as Record<string, unknown> | null,
  signupCount: 0,
  userName: "Maria",
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u-guest" } } }),
    },
    from: (table: string) => {
      if (table === "shared_meals") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: state.meal, error: null }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "meal_signups") {
        return {
          select: (_cols: string, opts?: { count?: string }) => {
            if (opts?.count) {
              return {
                eq: () => ({
                  eq: () => Promise.resolve({ count: state.signupCount, error: null }),
                }),
              };
            }
            return { eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
          },
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { display_name: state.userName }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      };
    },
  }),
}));

// Env-Variablen setzen fuer Notification-Pfad
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

import { POST } from "@/app/api/meals/signup/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/meals/signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Meals Signup Notifications", () => {
  beforeEach(() => {
    notificationCalls.length = 0;
    state.meal = { id: "meal-1", servings: 3, status: "active", user_id: "u-host", title: "Lasagne" };
    state.signupCount = 0;
    state.userName = "Maria";
  });

  it("sendet Anmelde-Notification an Gastgeber", async () => {
    const res = await POST(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);

    // Mindestens 1 Notification
    expect(notificationCalls.length).toBeGreaterThanOrEqual(1);
    const signupNotif = notificationCalls.find((n) => n.title.includes("Maria"));
    expect(signupNotif).toBeTruthy();
    expect(signupNotif!.user_id).toBe("u-host");
  });

  it("sendet Extra-Notification wenn voll", async () => {
    state.signupCount = 2; // 2 von 3, +1 = voll
    const res = await POST(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);

    // 2 Notifications: Anmeldung + Voll
    expect(notificationCalls.length).toBe(2);
    const fullNotif = notificationCalls.find((n) => n.title.includes("Alle Portionen"));
    expect(fullNotif).toBeTruthy();
  });

  it("sendet nur Anmelde-Notification wenn nicht voll", async () => {
    state.signupCount = 0; // 0 von 3, +1 = nicht voll
    const res = await POST(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);

    // Nur 1 Notification (Anmeldung)
    expect(notificationCalls.length).toBe(1);
    expect(notificationCalls[0].title).toContain("Maria");
  });

  it("verwendet Gastgeber-UserId als Empfaenger", async () => {
    const res = await POST(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);

    expect(notificationCalls[0].user_id).toBe("u-host");
  });
});
