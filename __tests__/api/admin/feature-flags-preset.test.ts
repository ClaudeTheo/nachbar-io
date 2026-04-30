import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PHASE_1_PRESET,
  PHASE_2A_AFTER_HR_FLAGS,
} from "@/lib/feature-flags-presets";

const mockGetUser = vi.fn();
const mockUsersSingle = vi.fn();
const mockFeatureFlagsUpsert = vi.fn();
const mockFrom = vi.fn();
const mockInvalidateFlagCache = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/feature-flags-cache", () => ({
  invalidateFlagCache: () => mockInvalidateFlagCache(),
}));

function setupAdmin(isAdmin = true) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  mockUsersSingle.mockResolvedValue({ data: { is_admin: isAdmin }, error: null });
}

function setupTables() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockUsersSingle,
          })),
        })),
      };
    }

    if (table === "feature_flags") {
      return {
        upsert: mockFeatureFlagsUpsert,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });
  mockFeatureFlagsUpsert.mockResolvedValue({ error: null });
}

async function postPreset(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/admin/feature-flags/preset/route");
  return POST(
    new Request("http://localhost/api/admin/feature-flags/preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/feature-flags/preset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    setupTables();
    setupAdmin(true);
  });

  it("setzt Phase-1-Flags mit Audit-Reason und invalidiert Cache einmal", async () => {
    const response = await postPreset({
      phase: "phase_1",
      confirm: "PHASE_1",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      phase: "phase_1",
      changed: Object.keys(PHASE_1_PRESET).length,
    });

    expect(mockFeatureFlagsUpsert).toHaveBeenCalledTimes(1);
    const [rows, options] = mockFeatureFlagsUpsert.mock.calls[0];
    expect(options).toEqual({ onConflict: "key" });
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          key: "PILOT_MODE",
          enabled: true,
          last_change_reason: "phase-preset:phase_1",
        },
        {
          key: "BILLING_ENABLED",
          enabled: false,
          last_change_reason: "phase-preset:phase_1",
        },
      ]),
    );
    expect(mockInvalidateFlagCache).toHaveBeenCalledTimes(1);
  });

  it("gibt 400 bei Confirm-Mismatch zurueck", async () => {
    const response = await postPreset({
      phase: "phase_1",
      confirm: "FALSCH",
    });

    expect(response.status).toBe(400);
    expect(mockFeatureFlagsUpsert).not.toHaveBeenCalled();
    expect(mockInvalidateFlagCache).not.toHaveBeenCalled();
  });

  it("akzeptiert Phase-2a als generisches Preset", async () => {
    const response = await postPreset({
      phase: "phase_2a",
      confirm: "PHASE_2A",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      phase: "phase_2a",
      changed: PHASE_2A_AFTER_HR_FLAGS.length,
    });

    const [rows] = mockFeatureFlagsUpsert.mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          key: "BILLING_ENABLED",
          enabled: true,
          last_change_reason: "phase-preset:phase_2a",
        },
      ]),
    );
  });

  it("gibt 403 fuer Nicht-Admins zurueck", async () => {
    setupAdmin(false);

    const response = await postPreset({
      phase: "phase_1",
      confirm: "PHASE_1",
    });

    expect(response.status).toBe(403);
    expect(mockFeatureFlagsUpsert).not.toHaveBeenCalled();
  });
});
