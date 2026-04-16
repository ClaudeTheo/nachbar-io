import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDwdCapXml, toCacheRow } from "../parser";

const fixtureXml = readFileSync(
  resolve(
    process.cwd(),
    "lib/integrations/dwd/__tests__/fixtures/dwd-hitze.cap.xml",
  ),
  "utf-8",
);

describe("parseDwdCapXml", () => {
  it("parses a CAP fixture into a typed alert", () => {
    const alert = parseDwdCapXml(fixtureXml);

    expect(alert.identifier).toContain("DWD.PVW");
    expect(alert.info[0]?.event).toBe("HITZE");
    expect(alert.info[0]?.area?.[0]?.geocode?.[0]?.value).toBe("808337007");
  });
});

describe("toCacheRow", () => {
  const ctx = {
    quarterId: "quarter-1",
    ars: "08337007",
    batchId: "00000000-0000-0000-0000-000000000002",
  };

  it("maps a CAP alert to a valid cache row", () => {
    const alert = parseDwdCapXml(fixtureXml);
    const row = toCacheRow(alert, ctx);

    expect(row.provider).toBe("dwd");
    expect(row.warncell_id).toBe("808337007");
    expect(row.severity).toBe("severe");
    expect(row.attribution_text).toBe("Quelle: Deutscher Wetterdienst");
    expect(row.event_code).toBe("31");
  });

  it("marks Cancel alerts as cancelled", () => {
    const alert = parseDwdCapXml(
      fixtureXml.replace("<msgType>Alert</msgType>", "<msgType>Cancel</msgType>"),
    );
    const row = toCacheRow(alert, ctx);

    expect(row.status).toBe("cancelled");
  });

  it("maps a WFS feature payload as fallback transport", () => {
    const row = toCacheRow(
      {
        id: "Warnungen_Gemeinden.1",
        type: "Feature",
        properties: {
          IDENTIFIER:
            "2.49.0.0.276.0.DWD.PVW.1786075200000.bad-saeckingen-hitze.DEU",
          WARNCELLID: 808337007,
          SENT: "2026-08-06T10:00:00+02:00",
          STATUS: "Actual",
          MSGTYPE: "Alert",
          CATEGORY: "Met",
          EVENT: "HITZE",
          SEVERITY: "Extreme",
          EC_II: "31",
          ONSET: "2026-08-06T12:00:00+02:00",
          EXPIRES: "2026-08-07T19:00:00+02:00",
          HEADLINE: "Amtliche WARNUNG vor HITZE",
          DESCRIPTION:
            "Am Donnerstag wird eine aussergewoehnliche Waermebelastung erwartet.",
          INSTRUCTION: "Auf Hitze achten und ausreichend trinken.",
          WEB: "https://dwd.de/warnungen",
        },
      },
      ctx,
    );

    expect(row.severity).toBe("extreme");
    expect(row.warncell_id).toBe("808337007");
  });
});
