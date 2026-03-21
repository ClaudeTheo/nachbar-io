import { describe, it, expect, vi, beforeEach } from "vitest";

// State fuer Mocks
const state = {
  user: { id: "u-1" } as { id: string } | null,
  meal: { id: "meal-1", servings: 3, status: "active", user_id: "u-2" } as Record<string, unknown> | null,
  signupCount: 1,
  insertError: null as { code?: string; message: string } | null,
  updateCalled: false,
};

// Supabase Mock
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    const base = () => ({
      select: (..._args: unknown[]) => base(),
      eq: () => base(),
      single: () => Promise.resolve({ data: state.meal, error: state.meal ? null : { message: "not found" } }),
      insert: () => Promise.resolve({ error: state.insertError }),
      update: () => {
        state.updateCalled = true;
        return { eq: () => Promise.resolve({ error: null, count: 1 }) };
      },
    });

    return Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: state.user } }),
      },
      from: (table: string) => {
        if (table === "meal_signups") {
          return {
            select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.count) {
                return {
                  eq: () => ({
                    eq: () => Promise.resolve({ count: state.signupCount, error: null }),
                  }),
                };
              }
              return {
                eq: () => ({
                  eq: () => ({
                    eq: () => Promise.resolve({ error: null, count: 1 }),
                  }),
                }),
              };
            },
            insert: () => Promise.resolve({ error: state.insertError }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ error: null, count: 1 }),
                }),
              }),
            }),
          };
        }
        if (table === "shared_meals") {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: state.meal,
                  error: state.meal ? null : { message: "not found" },
                }),
              }),
            }),
            update: () => {
              state.updateCalled = true;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        return base();
      },
    });
  },
}));

// Route importieren
import { POST as signupRoute } from "@/app/api/meals/signup/route";
import { POST as cancelRoute } from "@/app/api/meals/cancel/route";
import { NextRequest } from "next/server";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/meals/signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeCancelReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/meals/cancel", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Meals Signup API", () => {
  beforeEach(() => {
    state.user = { id: "u-1" };
    state.meal = { id: "meal-1", servings: 3, status: "active", user_id: "u-2" };
    state.signupCount = 1;
    state.insertError = null;
    state.updateCalled = false;
  });

  it("gibt 401 ohne User", async () => {
    state.user = null;
    const res = await signupRoute(makeReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(401);
  });

  it("gibt 400 ohne meal_id", async () => {
    const res = await signupRoute(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("gibt 404 bei unbekannter Mahlzeit", async () => {
    state.meal = null;
    const res = await signupRoute(makeReq({ meal_id: "unknown" }));
    expect(res.status).toBe(404);
  });

  it("gibt 409 wenn Mahlzeit nicht aktiv", async () => {
    state.meal = { ...state.meal!, status: "full" };
    const res = await signupRoute(makeReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(409);
  });

  it("gibt 400 bei eigenem Angebot", async () => {
    state.meal = { ...state.meal!, user_id: "u-1" };
    const res = await signupRoute(makeReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(400);
  });

  it("erfolgreiche Anmeldung", async () => {
    const res = await signupRoute(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("setzt Status auf full wenn letzte Portion", async () => {
    state.signupCount = 2; // 2 von 3 belegt, +1 = voll
    const res = await signupRoute(makeReq({ meal_id: "meal-1", portions: 1 }));
    expect(res.status).toBe(200);
    expect(state.updateCalled).toBe(true);
  });

  it("gibt 409 bei Duplicate-Anmeldung", async () => {
    state.insertError = { code: "23505", message: "duplicate" };
    const res = await signupRoute(makeReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(409);
  });
});

describe("Meals Cancel API", () => {
  beforeEach(() => {
    state.user = { id: "u-1" };
    state.meal = { id: "meal-1", servings: 3, status: "active", user_id: "u-2" };
    state.updateCalled = false;
  });

  it("gibt 401 ohne User", async () => {
    state.user = null;
    const res = await cancelRoute(makeCancelReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(401);
  });

  it("gibt 400 ohne meal_id", async () => {
    const res = await cancelRoute(makeCancelReq({}));
    expect(res.status).toBe(400);
  });

  it("gibt 404 bei unbekannter Mahlzeit", async () => {
    state.meal = null;
    const res = await cancelRoute(makeCancelReq({ meal_id: "unknown" }));
    expect(res.status).toBe(404);
  });

  it("erfolgreiche Stornierung", async () => {
    const res = await cancelRoute(makeCancelReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("setzt Status auf active wenn vorher full", async () => {
    state.meal = { ...state.meal!, status: "full" };
    const res = await cancelRoute(makeCancelReq({ meal_id: "meal-1" }));
    expect(res.status).toBe(200);
    expect(state.updateCalled).toBe(true);
  });
});
