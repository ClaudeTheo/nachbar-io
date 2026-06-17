import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

// Welle SP1-4: POST /api/spiele/teilnahme vergibt Punkte NUR fuers Mitmachen.
// Die Route ist bewusst gehaertet: sie nimmt KEINE Spielergebnisse und KEINE
// Aktion vom Client an — die Aktion ist serverseitig hartkodiert auf
// "daily_puzzle". Unauthentifiziert -> 401. Fire-and-forget vom Client.

const mockSupabase = createRouteMockSupabase();
const awardPointsMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/modules/gamification", () => ({
  awardPoints: (...args: unknown[]) => awardPointsMock(...args),
}));

describe("POST /api/spiele/teilnahme", () => {
  beforeEach(() => {
    mockSupabase.reset();
    awardPointsMock.mockReset();
    awardPointsMock.mockResolvedValue({
      awarded: true,
      points: 5,
      totalPoints: 5,
      level: 1,
    });
  });

  it("gibt 401 ohne Login zurueck und vergibt keine Punkte", async () => {
    const { POST } = await import("@/app/api/spiele/teilnahme/route");
    const res = await POST();
    expect(res.status).toBe(401);
    expect(awardPointsMock).not.toHaveBeenCalled();
  });

  it("vergibt eingeloggt genau die hartkodierte Aktion daily_puzzle", async () => {
    mockSupabase.setUser({ id: "u-senior", email: "senior@test.invalid" });

    const { POST } = await import("@/app/api/spiele/teilnahme/route");
    const res = await POST();

    expect(res.status).toBe(200);
    expect(awardPointsMock).toHaveBeenCalledTimes(1);
    expect(awardPointsMock).toHaveBeenCalledWith(
      mockSupabase.supabase,
      "u-senior",
      "daily_puzzle",
    );
  });

  it("nimmt keine Aktion vom Client an (Signatur ohne Request-Parameter)", async () => {
    const routeModule = await import("@/app/api/spiele/teilnahme/route");
    // Strukturelle Garantie: die Route liest gar keinen Request-Body, kann also
    // nicht zu einer hoeherwertigen Aktion verleitet werden.
    expect(routeModule.POST.length).toBe(0);
  });
});
