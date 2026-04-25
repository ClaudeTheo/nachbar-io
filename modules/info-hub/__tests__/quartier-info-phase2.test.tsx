import { describe, it, expect } from "vitest";

// Statische Config-Validierung
// Apotheken-Konstanten wurden 2026-04-25 entfernt zugunsten municipal_config.apotheken
// + .notdienst_url. Hartkodierte Telefonnummern und Oeffnungszeiten waren
// nicht autoritativ und durften nie als "geoeffnet" implizieren.
import {
  EVENTS_BAD_SAECKINGEN,
  EVENTS_CALENDAR_URL,
} from "@/modules/info-hub/services/events";
import {
  OEPNV_STOPS_BAD_SAECKINGEN,
  EFA_BW_BASE_URL,
} from "@/modules/info-hub/services/oepnv-stops";

describe("Statische Configs Phase 2", () => {
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
