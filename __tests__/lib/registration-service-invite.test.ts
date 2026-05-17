import { describe, expect, it, vi } from "vitest";
import { checkInviteCode } from "@/lib/services/registration.service";

function createQuery(result: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
  };
  return query;
}

describe("checkInviteCode", () => {
  it("findet gespeicherte Pilot-Briefcodes auch wenn der Client normalisiert", async () => {
    const householdQuery = createQuery({
      id: "household-1",
      street_name: "Purkersdorfer Straße",
      house_number: "35",
      quarter_id: "quarter-1",
    });
    const invitationQuery = createQuery(null);
    const from = vi.fn((table: string) => {
      if (table === "households") return householdQuery;
      if (table === "neighbor_invitations") return invitationQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await checkInviteCode(
      { from } as never,
      "PILOT-MZPD-DZCS",
    );

    expect(result).toEqual({
      valid: true,
      householdId: "household-1",
      streetName: "Purkersdorfer Straße",
      houseNumber: "35",
      quarterId: "quarter-1",
    });
    expect(householdQuery.in).toHaveBeenCalledWith(
      "invite_code",
      expect.arrayContaining(["PILOTMZPDDZCS", "PILOT-MZPD-DZCS"]),
    );
  });

  it("prueft persoenliche Einladungen mit denselben Code-Varianten", async () => {
    const householdQuery = createQuery(null);
    const invitationQuery = createQuery({
      id: "invite-1",
      household_id: "household-2",
      quarter_id: "quarter-2",
      inviter_id: "user-1",
      households: {
        street_name: "Sanarystraße",
        house_number: "7",
      },
    });
    const from = vi.fn((table: string) => {
      if (table === "households") return householdQuery;
      if (table === "neighbor_invitations") return invitationQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await checkInviteCode(
      { from } as never,
      "PILOT-MZPD-DZCS",
    );

    expect(result).toEqual({
      valid: true,
      householdId: "household-2",
      streetName: "Sanarystraße",
      houseNumber: "7",
      quarterId: "quarter-2",
      referrerId: "user-1",
    });
    expect(invitationQuery.in).toHaveBeenCalledWith(
      "invite_code",
      expect.arrayContaining(["PILOTMZPDDZCS", "PILOT-MZPD-DZCS"]),
    );
  });
});
