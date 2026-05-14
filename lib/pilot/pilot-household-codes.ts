import { createHash } from "crypto";
import { generateQuarterCode } from "@/lib/invite-codes";

export type PilotCodeKind = "primary" | "replacement";
export type PilotCodeStatus = "available" | "assigned" | "claimed" | "revoked" | "expired";

export interface PilotCodeHouseholdInput {
  id: string;
  quarterId: string;
  streetName: string;
  houseNumber: string;
}

export interface PilotCodeBatchInput {
  households: PilotCodeHouseholdInput[];
  primaryPerHousehold: number;
  replacementCount: number;
  batchLabel: string;
  prefix?: string;
}

export interface PlannedPilotCode {
  rawCode: string;
  codeHash: string;
  codeHint: string;
  codeKind: PilotCodeKind;
  status: PilotCodeStatus;
  quarterId: string;
  householdId: string | null;
  batchLabel: string;
}

export function normalizePilotAccessCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashPilotAccessCode(code: string): string {
  return createHash("sha256")
    .update(normalizePilotAccessCode(code), "utf8")
    .digest("hex");
}

export function buildPilotCodeHint(code: string): string {
  const formatted = code.toUpperCase().trim();
  const prefix = formatted.split("-")[0] || "CODE";
  const normalized = normalizePilotAccessCode(formatted);
  return `${prefix}-...${normalized.slice(-4)}`;
}

export function planPilotCodeBatch(input: PilotCodeBatchInput): {
  primary: PlannedPilotCode[];
  replacements: PlannedPilotCode[];
} {
  const prefix = input.prefix ?? "PILOT";
  const primary: PlannedPilotCode[] = [];

  for (const household of input.households) {
    for (let i = 0; i < input.primaryPerHousehold; i += 1) {
      primary.push(buildPlannedCode({
        prefix,
        codeKind: "primary",
        quarterId: household.quarterId,
        householdId: household.id,
        batchLabel: input.batchLabel,
      }));
    }
  }

  const replacementQuarterId = input.households[0]?.quarterId;
  const replacements = replacementQuarterId
    ? Array.from({ length: input.replacementCount }, () =>
        buildPlannedCode({
          prefix,
          codeKind: "replacement",
          quarterId: replacementQuarterId,
          householdId: null,
          batchLabel: input.batchLabel,
        }),
      )
    : [];

  return { primary, replacements };
}

function buildPlannedCode(input: {
  prefix: string;
  codeKind: PilotCodeKind;
  quarterId: string;
  householdId: string | null;
  batchLabel: string;
}): PlannedPilotCode {
  const rawCode = generateQuarterCode(input.prefix);

  return {
    rawCode,
    codeHash: hashPilotAccessCode(rawCode),
    codeHint: buildPilotCodeHint(rawCode),
    codeKind: input.codeKind,
    status: input.codeKind === "replacement" && input.householdId === null ? "available" : "assigned",
    quarterId: input.quarterId,
    householdId: input.householdId,
    batchLabel: input.batchLabel,
  };
}
