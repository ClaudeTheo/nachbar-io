import { describe, expect, it } from "vitest";
import { getE2eUserRole } from "@/tests/e2e/helpers/db-seeder";
import type { AgentCredentials } from "@/tests/e2e/helpers/types";

function credentials(role: AgentCredentials["role"]): AgentCredentials {
  return {
    email: `${role}@test.nachbar.local`,
    password: "TestPass123!",
    displayName: "Test User",
    inviteCode: "TEST0001",
    uiMode: role === "senior" ? "senior" : "active",
    role,
  };
}

describe("getE2eUserRole", () => {
  it.each([
    ["nachbar", "resident"],
    ["helfer", "resident"],
    ["senior", "senior"],
    ["betreuer", "caregiver"],
    ["org_admin", "org_admin"],
    ["doctor", "doctor"],
    ["unverified", "resident"],
  ] as const)("mappt E2E-Agent %s auf users.role=%s", (agentRole, userRole) => {
    expect(getE2eUserRole(credentials(agentRole))).toBe(userRole);
  });
});
