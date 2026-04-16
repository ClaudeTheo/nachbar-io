import { describe, expect, it } from "vitest";
import type { NinaDashboardItem } from "../types";
import fixture from "./fixtures/nina-bad-saeckingen.json";
import { toCacheRow } from "../parser";

describe("toCacheRow", () => {
  const dashboardFixture = fixture as NinaDashboardItem[];
  const ctx = {
    ars: "08337007",
    batchId: "00000000-0000-0000-0000-000000000001",
  };

  it("maps a dashboard item to a valid cache row", () => {
    const [first] = dashboardFixture;
    const row = toCacheRow(first, ctx);

    expect(row.provider).toBe("nina");
    expect(row.external_id).toBe(first.id);
    expect(row.attribution_text).toMatch(/BBK/);
    expect(["minor", "moderate", "severe", "extreme", "unknown"]).toContain(
      row.severity,
    );
    expect(row.event_code).toBe("BBK-EVC-010");
  });

  it("marks Cancel type as cancelled", () => {
    const row = toCacheRow(
      {
        ...dashboardFixture[0],
        type: "Cancel",
      },
      ctx,
    );

    expect(row.status).toBe("cancelled");
  });

  it("falls back to i18nTitle when headline is missing", () => {
    const row = toCacheRow(
      {
        ...dashboardFixture[0],
        payload: { ...dashboardFixture[0].payload, data: {} },
        i18nTitle: { DE: "Fallback" },
      },
      ctx,
    );

    expect(row.headline).toBe("Fallback");
  });
});
