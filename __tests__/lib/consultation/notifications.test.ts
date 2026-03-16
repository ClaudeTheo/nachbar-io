import { describe, it, expect } from "vitest";
import { buildNotificationContent } from "@/lib/consultation/notifications";

describe("buildNotificationContent", () => {
  it("erzeugt Push-Text fuer neuen Vorschlag", () => {
    const content = buildNotificationContent("proposed", "Dr. Meier", "2026-03-20T10:00:00Z");
    expect(content.title).toContain("Terminvorschlag");
    expect(content.body).toContain("Dr. Meier");
    expect(content.body).toContain("20.03.2026");
    // Keine sensiblen Daten
    expect(content.body).not.toContain("Diagnose");
  });

  it("erzeugt Push-Text fuer Bestaetigung", () => {
    const content = buildNotificationContent("confirmed", "Dr. Meier", "2026-03-20T10:00:00Z");
    expect(content.title).toContain("bestätigt");
  });

  it("erzeugt Push-Text fuer Gegenvorschlag", () => {
    const content = buildNotificationContent("counter_proposed", "Dr. Meier", "2026-03-21T14:00:00Z");
    expect(content.title).toContain("Terminvorschlag");
    expect(content.body).toContain("21.03.2026");
  });

  it("erzeugt Push-Text fuer Erinnerung", () => {
    const content = buildNotificationContent("reminder", "Dr. Meier", "2026-03-20T10:00:00Z");
    expect(content.title).toContain("1 Stunde");
  });
});
