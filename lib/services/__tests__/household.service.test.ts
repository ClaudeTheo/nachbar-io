// Tests fuer den Household-Service
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

import {
  getHousehold,
  getHouseholdForUser,
  getMembership,
  getHouseholdMembers,
  getHouseholdsByQuarter,
} from "../household.service";

const MOCK_HOUSEHOLD = {
  id: "hh-1",
  quarter_id: "q-1",
  street_name: "Purkersdorfer Straße",
  house_number: "12",
  lat: 47.5535,
  lng: 7.964,
  verified: true,
  invite_code: "PILOT-ABC123",
  created_at: "2026-01-01T00:00:00Z",
};

const MOCK_MEMBER = {
  id: "m-1",
  household_id: "hh-1",
  user_id: "user-1",
  role: "owner",
  verification_method: "invite_code",
  verified_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("getHousehold", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt Haushalt anhand der ID", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_HOUSEHOLD, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHousehold("hh-1");
    expect(mockFrom).toHaveBeenCalledWith("households");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("id", "hh-1");
    expect(result.street_name).toBe("Purkersdorfer Straße");
  });

  it("wirft Fehler wenn Haushalt nicht existiert", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getHousehold("unknown")).rejects.toEqual({ message: "Not found" });
  });
});

describe("getHouseholdForUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt Haushalt ueber household_members Join", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { household: MOCK_HOUSEHOLD },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHouseholdForUser("user-1");
    expect(mockFrom).toHaveBeenCalledWith("household_members");
    expect(chain.select).toHaveBeenCalledWith("household:households(*)");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.not).toHaveBeenCalledWith("verified_at", "is", null);
    expect(result?.street_name).toBe("Purkersdorfer Straße");
  });

  it("gibt null zurueck wenn kein Haushalt zugewiesen", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHouseholdForUser("orphan-user");
    expect(result).toBeNull();
  });
});

describe("getMembership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt verifizierte Mitgliedschaft eines Nutzers", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_MEMBER, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getMembership("user-1");
    expect(mockFrom).toHaveBeenCalledWith("household_members");
    expect(chain.not).toHaveBeenCalledWith("verified_at", "is", null);
    expect(result?.role).toBe("owner");
  });

  it("gibt null zurueck wenn keine verifizierte Mitgliedschaft", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getMembership("unverified-user");
    expect(result).toBeNull();
  });
});

describe("getHouseholdMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt alle verifizierten Mitglieder eines Haushalts", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_MEMBER], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHouseholdMembers("hh-1");
    expect(mockFrom).toHaveBeenCalledWith("household_members");
    expect(chain.eq).toHaveBeenCalledWith("household_id", "hh-1");
    expect(chain.not).toHaveBeenCalledWith("verified_at", "is", null);
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toHaveLength(1);
  });

  it("gibt leeres Array zurueck wenn keine Mitglieder", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHouseholdMembers("empty-hh");
    expect(result).toEqual([]);
  });
});

describe("getHouseholdsByQuarter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt alle Haushalte eines Quartiers sortiert nach Strasse", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [MOCK_HOUSEHOLD], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHouseholdsByQuarter("q-1");
    expect(mockFrom).toHaveBeenCalledWith("households");
    expect(chain.eq).toHaveBeenCalledWith("quarter_id", "q-1");
    expect(chain.order).toHaveBeenCalledWith("street_name", { ascending: true });
    expect(result).toHaveLength(1);
  });
});
