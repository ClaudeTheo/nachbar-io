// __tests__/app/after-login.test.tsx
// Task B-4: Der /after-login Server-Page dispatch — nach erfolgreichem Login
// wird hier entschieden, ob der Nutzer auf /kreis-start (Senior) oder
// /dashboard landet. Alle Login-Wege (Password, OTP, Magic-Link-Callback)
// zeigen auf /after-login statt direkt auf ein Dashboard.

import { describe, it, expect, vi, beforeEach } from "vitest";

// next/navigation.redirect() wirft in Next.js einen speziellen Error.
// Wir mocken das mit einem erkennbaren Error, den wir im Test abfangen.
class RedirectError extends Error {
  constructor(public path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((path: string) => {
    throw new RedirectError(path);
  }),
}));

// Supabase-Server-Client Mock — pro Test ueberschreibbar
type MockUser = { id: string } | null;
type MockProfile = { ui_mode: string } | null;

let mockUser: MockUser;
let mockProfile: MockProfile;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: {
        getUser: vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ data: { user: mockUser }, error: null }),
          ),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      })),
    }),
  ),
}));

async function runPage(): Promise<string> {
  const mod = await import("@/app/after-login/page");
  try {
    await mod.default();
  } catch (err) {
    if (err instanceof RedirectError) return err.path;
    throw err;
  }
  throw new Error("Page did not redirect");
}

describe("/after-login (B-4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("sendet Senior auf /kreis-start", async () => {
    mockUser = { id: "user-senior-1" };
    mockProfile = { ui_mode: "senior" };

    const path = await runPage();
    expect(path).toBe("/kreis-start");
  });

  it("sendet aktive Nutzer auf /dashboard", async () => {
    mockUser = { id: "user-active-1" };
    mockProfile = { ui_mode: "active" };

    const path = await runPage();
    expect(path).toBe("/dashboard");
  });

  it("sendet nicht eingeloggte Nutzer auf /login", async () => {
    mockUser = null;
    mockProfile = null;

    const path = await runPage();
    expect(path).toBe("/login");
  });

  it("faellt bei fehlendem users-Profil auf /dashboard zurueck", async () => {
    mockUser = { id: "user-no-profile" };
    mockProfile = null;

    const path = await runPage();
    expect(path).toBe("/dashboard");
  });
});
