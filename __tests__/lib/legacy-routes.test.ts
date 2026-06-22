// Welle 3 (C1:6) — Pilot-Positivliste: flag-lose, nicht-pilotreife Module sind
// serverseitig verriegelt (isLegacyRoute=true) und werden im Proxy sanft auf
// /dashboard umgeleitet. Kehrt die 2026-05-11-Entscheidung ("alles offen")
// bewusst um (Founder-Go 2026-06-22). board/marketplace/events laufen NICHT
// hierueber, sondern ueber eigene Flag-Gates (Welle 1 + events-layout).
import { describe, it, expect } from "vitest";
import { isLegacyRoute } from "@/lib/legacy-routes";

describe("isLegacyRoute — Pilot-Positivliste (C1:6)", () => {
  const blocked = [
    "/lost-found",
    "/polls",
    "/leihboerse",
    "/whohas",
    "/mitessen",
    "/noise",
    "/tips",
    "/experts",
    "/packages",
  ];

  for (const route of blocked) {
    it(`verriegelt ${route}`, () => {
      expect(isLegacyRoute(route)).toBe(true);
    });
    it(`verriegelt Sub-Route ${route}/123`, () => {
      expect(isLegacyRoute(`${route}/123`)).toBe(true);
    });
  }

  // Pilot-Kern, Infrastruktur, Info-Surface + flag-gegatete Module (eigene Gates)
  const allowed = [
    "/dashboard",
    "/mein-kreis",
    "/care",
    "/care/meine-senioren",
    "/chat",
    "/gruppen",
    "/hilfe",
    "/my-day",
    "/quartier-info",
    "/news",
    "/map",
    "/waste-calendar",
    "/board", // Flag-Gate (Welle 1), nicht Positivliste
    "/marketplace", // Flag-Gate (Welle 1)
    "/events", // Flag-Gate (events-layout)
    "/was-steht-uns-zu", // Leistungen-Info (LIVE) bleibt erreichbar
    "/pflegegrad-navigator",
    "/ki-fragebogen",
  ];

  for (const route of allowed) {
    it(`laesst ${route} erreichbar`, () => {
      expect(isLegacyRoute(route)).toBe(false);
    });
  }

  it("matcht nicht auf Praefix-Teilstrings (z.B. /tipsy ist nicht /tips)", () => {
    expect(isLegacyRoute("/tipsy")).toBe(false);
  });
});
