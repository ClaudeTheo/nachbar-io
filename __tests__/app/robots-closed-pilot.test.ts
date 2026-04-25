import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots im Closed-Pilot-Modus", () => {
  it("sperrt Suchmaschinen fuer die gesamte Testumgebung", () => {
    const config = robots();

    expect(config.rules).toEqual({
      userAgent: "*",
      disallow: "/",
    });
    expect(config.sitemap).toBeUndefined();
  });
});
