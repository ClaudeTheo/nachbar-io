// Gating-Test Welle 1 (F5-Fundament):
// Stellt sicher, dass /board und /marketplace serverseitig hinter ihren
// DB-Feature-Flags liegen. Ist das Flag false (oder fehlt es / DB-Fehler),
// muss das Server-Layout auf /dashboard umleiten (fail-closed / default-deny).
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

describe("Feature-Gating: /board + /marketplace (serverseitig)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateClient.mockResolvedValue({});
  });

  it("/board: leitet auf /dashboard um, wenn BOARD_ENABLED false ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(false);

    const Layout = (await import("@/app/(app)/board/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockIsFeatureEnabledServer).toHaveBeenCalledWith(
      expect.anything(),
      "BOARD_ENABLED",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("/board: kein Redirect, wenn BOARD_ENABLED true ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(true);

    const Layout = (await import("@/app/(app)/board/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("/marketplace: leitet auf /dashboard um, wenn MARKETPLACE_ENABLED false ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(false);

    const Layout = (await import("@/app/(app)/marketplace/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockIsFeatureEnabledServer).toHaveBeenCalledWith(
      expect.anything(),
      "MARKETPLACE_ENABLED",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("/marketplace: kein Redirect, wenn MARKETPLACE_ENABLED true ist", async () => {
    mockIsFeatureEnabledServer.mockResolvedValue(true);

    const Layout = (await import("@/app/(app)/marketplace/layout")).default;
    await Layout({ children: "inhalt" });

    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
