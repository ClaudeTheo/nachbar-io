// Tests fuer A4: detectNavRole ist civic-aware
// Ein User in civic_members (type='housing' oder andere civic_organizations)
// soll ebenfalls die org_admin-Rolle bekommen, damit er das Cockpit-Nav
// sieht. Priorisierung bleibt: org_admin > caregiver > helper > senior.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Kontrollierbare Query-Ergebnisse
interface RowList {
  data: Array<{ id: string }> | null;
}
const mockResults: {
  orgMembers: RowList;
  civicMembers: RowList;
  caregiverLinks: RowList;
  helperProfiles: RowList;
} = {
  orgMembers: { data: null },
  civicMembers: { data: null },
  caregiverLinks: { data: null },
  helperProfiles: { data: null },
};

// Supabase-Chain-Mock: .from(table).select().eq()...limit(1) -> entsprechender Result
function makeChain(resolveTo: RowList) {
  const chain: Record<string, unknown> = {};
  const promiseLike = {
    then: (resolve: (value: RowList) => unknown) => resolve(resolveTo),
  };
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(promiseLike);
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      switch (table) {
        case "org_members":
          return makeChain(mockResults.orgMembers);
        case "civic_members":
          return makeChain(mockResults.civicMembers);
        case "caregiver_links":
          return makeChain(mockResults.caregiverLinks);
        case "hilfe_helper_profiles":
          return makeChain(mockResults.helperProfiles);
        default:
          return makeChain({ data: null });
      }
    }),
  })),
}));

describe("detectNavRole — civic-aware (A4)", () => {
  beforeEach(() => {
    mockResults.orgMembers = { data: null };
    mockResults.civicMembers = { data: null };
    mockResults.caregiverLinks = { data: null };
    mockResults.helperProfiles = { data: null };
  });

  it("User in civic_members → org_admin (Housing-Staff)", async () => {
    mockResults.civicMembers = { data: [{ id: "cm-1" }] };
    const { detectNavRole } = await import("../NavConfig");
    const role = await detectNavRole("user-1");
    expect(role).toBe("org_admin");
  });

  it("User in org_members (klassisch) → org_admin (Regression)", async () => {
    mockResults.orgMembers = { data: [{ id: "om-1" }] };
    const { detectNavRole } = await import("../NavConfig");
    const role = await detectNavRole("user-2");
    expect(role).toBe("org_admin");
  });

  it("User in beiden Welten → org_admin (keine doppelte Rolle)", async () => {
    mockResults.orgMembers = { data: [{ id: "om-x" }] };
    mockResults.civicMembers = { data: [{ id: "cm-x" }] };
    const { detectNavRole } = await import("../NavConfig");
    const role = await detectNavRole("user-3");
    expect(role).toBe("org_admin");
  });

  it("User in caregiver_links (nicht civic/org) → caregiver", async () => {
    mockResults.caregiverLinks = { data: [{ id: "cl-1" }] };
    const { detectNavRole } = await import("../NavConfig");
    const role = await detectNavRole("user-4");
    expect(role).toBe("caregiver");
  });

  it("User ohne Zuordnung → senior (Default)", async () => {
    const { detectNavRole } = await import("../NavConfig");
    const role = await detectNavRole("user-5");
    expect(role).toBe("senior");
  });
});
