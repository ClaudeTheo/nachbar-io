import { describe, it, expect } from "vitest";

// Statische Config-Validierung
import { APOTHEKEN_BAD_SAECKINGEN, NOTDIENST_URL } from "@/lib/info/apotheken";
import { EVENTS_BAD_SAECKINGEN, EVENTS_CALENDAR_URL } from "@/lib/info/events";
import {
  OEPNV_STOPS_BAD_SAECKINGEN,
  EFA_BW_BASE_URL,
} from "@/lib/info/oepnv-stops";

describe("Statische Configs Phase 2", () => {
  it("Apotheken: 3 Apotheken mit gueltigen Telefonnummern", () => {
    expect(APOTHEKEN_BAD_SAECKINGEN).toHaveLength(3);
    for (const apo of APOTHEKEN_BAD_SAECKINGEN) {
      expect(apo.name).toBeTruthy();
      expect(apo.address).toContain("Bad Säckingen");
      expect(apo.phone).toMatch(/^07761/);
      expect(apo.openingHours).toBeTruthy();
    }
  });

  it("Apotheken: Notdienst-URL zeigt auf aponet.de PLZ 79713", () => {
    expect(NOTDIENST_URL).toContain("aponet.de");
    expect(NOTDIENST_URL).toContain("79713");
  });

  it("Events: Wochenmarkt-Termine vorhanden", () => {
    expect(EVENTS_BAD_SAECKINGEN.length).toBeGreaterThanOrEqual(2);
    const titles = EVENTS_BAD_SAECKINGEN.map((e) => e.title);
    expect(titles).toContain("Wochenmarkt");
  });

  it("Events: Kalender-URL zeigt auf badsaeckingen.de", () => {
    expect(EVENTS_CALENDAR_URL).toContain("badsaeckingen.de");
  });

  it("ÖPNV: Bad Säckingen Bahnhof konfiguriert", () => {
    expect(OEPNV_STOPS_BAD_SAECKINGEN).toHaveLength(1);
    expect(OEPNV_STOPS_BAD_SAECKINGEN[0].id).toBe("8506566");
    expect(OEPNV_STOPS_BAD_SAECKINGEN[0].name).toContain("Bahnhof");
  });

  it("ÖPNV: EFA-BW Base-URL korrekt", () => {
    expect(EFA_BW_BASE_URL).toContain("efa-bw.de");
  });
});
