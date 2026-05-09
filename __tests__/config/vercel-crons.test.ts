import { describe, expect, it } from "vitest";
import vercelConfig from "../../vercel.json";

describe("vercel cron schedules", () => {
  it("plant die Quartier-Info Auto-Sync-Crons nach Mig 188", () => {
    expect(vercelConfig.crons).toEqual(
      expect.arrayContaining([
        {
          path: "/api/cron/osm-poi-sync",
          schedule: "0 3 * * 0",
        },
        {
          path: "/api/cron/quartier-events-sync",
          schedule: "0 6 * * *",
        },
      ]),
    );
  });
});
