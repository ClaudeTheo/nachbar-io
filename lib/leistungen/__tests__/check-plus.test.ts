import { describe, it, expect } from "vitest";
import { hasPlusAccess } from "../check-plus";

// Schema (siehe modules/care/services/types.ts):
//   plan: 'free' | 'plus' | 'pro'
//   status: 'active' | 'trial' | 'cancelled' | 'expired'
// Pro inkludiert alle Plus-Features (PLAN_FEATURES in care/services/constants.ts).
describe("hasPlusAccess", () => {
  it("true bei plan=plus und status=active", () => {
    expect(
      hasPlusAccess({ plan: "plus", status: "active", trial_ends_at: null }),
    ).toBe(true);
  });

  it("true bei plan=plus und status=trial mit Zukunfts-trial_ends_at", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      hasPlusAccess({ plan: "plus", status: "trial", trial_ends_at: future }),
    ).toBe(true);
  });

  it("true bei plan=plus und status=trial ohne trial_ends_at (kulant)", () => {
    expect(
      hasPlusAccess({ plan: "plus", status: "trial", trial_ends_at: null }),
    ).toBe(true);
  });

  it("true bei plan=pro und status=active (Pro inkludiert Plus)", () => {
    expect(
      hasPlusAccess({ plan: "pro", status: "active", trial_ends_at: null }),
    ).toBe(true);
  });

  it("false bei plan=free", () => {
    expect(
      hasPlusAccess({ plan: "free", status: "active", trial_ends_at: null }),
    ).toBe(false);
  });

  it("false bei plan=plus aber trial abgelaufen", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      hasPlusAccess({ plan: "plus", status: "trial", trial_ends_at: past }),
    ).toBe(false);
  });

  it("false bei plan=plus aber status=cancelled", () => {
    expect(
      hasPlusAccess({ plan: "plus", status: "cancelled", trial_ends_at: null }),
    ).toBe(false);
  });

  it("false bei plan=plus aber status=expired", () => {
    expect(
      hasPlusAccess({ plan: "plus", status: "expired", trial_ends_at: null }),
    ).toBe(false);
  });

  it("false bei null subscription", () => {
    expect(hasPlusAccess(null)).toBe(false);
  });
});
