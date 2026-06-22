// Welle 3 (C1:6) — /events serverseitig hinter EVENTS_ENABLED (Welle-1-Muster).
// events hat ein DB-Flag, daher Flag-Gate statt Positivliste: Flag=false
// (oder fehlt / DB-Fehler) ⇒ Redirect /dashboard (fail-closed / default-deny).
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
const mockCreateClient = vi.fn();
const mockIsFeatureEnabledServer = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/feature-flags-server", () => ({
  isFeatureEnabledServer: (...args: unknown[]) =>
    mockIsFeatureEnabledServer(...args),
}));

describe("Feature-Gating: /events (serverseitig)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateClient.mockResolvedValue({});
  });

  it("leitet auf /dashboard um, wenn EVENTS_ENABLED false ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(false);

    const Layout = (await import("@/app/(app)/events/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockIsFeatureEnabledServer).toHaveBeenCalledWith(
      expect.anything(),
      "EVENTS_ENABLED",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("kein Redirect, wenn EVENTS_ENABLED true ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(true);

    const Layout = (await import("@/app/(app)/events/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
