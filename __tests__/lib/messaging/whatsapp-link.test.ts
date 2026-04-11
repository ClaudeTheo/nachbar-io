// __tests__/lib/messaging/whatsapp-link.test.ts
// Task H-1: /schreiben Route fuer Senior-UI.
// Reiner Helper der aus einer rohen Telefonnummer einen wa.me-Link baut.
// Senioren tippen in /schreiben auf ein Kreis-Mitglied → WhatsApp oeffnet
// mit leerer (oder vorbereiteter) Nachricht an diese Person.

import { describe, it, expect } from "vitest";
import { buildWhatsAppLink } from "@/lib/messaging/whatsapp-link";

describe("buildWhatsAppLink (H-1)", () => {
  it("normalisiert eine deutsche Mobilnummer mit fuehrender 0 auf internationales Format", () => {
    // 0176 12345678 → 4917612345678 (fuehrende 0 durch 49 ersetzt)
    expect(buildWhatsAppLink("0176 12345678")).toBe(
      "https://wa.me/4917612345678",
    );
  });

  it("strippt das + bei Nummern im E.164-Format", () => {
    expect(buildWhatsAppLink("+49 176 12345678")).toBe(
      "https://wa.me/4917612345678",
    );
  });

  it("entfernt Klammern, Bindestriche und Leerzeichen", () => {
    expect(buildWhatsAppLink("(0176) 123-456 78")).toBe(
      "https://wa.me/4917612345678",
    );
  });

  it("haengt einen URL-codierten Vorschlagstext an wenn uebergeben", () => {
    expect(
      buildWhatsAppLink("+49 176 12345678", "Hallo, wie geht es Dir?"),
    ).toBe(
      "https://wa.me/4917612345678?text=Hallo%2C%20wie%20geht%20es%20Dir%3F",
    );
  });

  it("gibt null zurueck bei leerer Nummer", () => {
    expect(buildWhatsAppLink("")).toBeNull();
    expect(buildWhatsAppLink("   ")).toBeNull();
  });

  it("gibt null zurueck bei Nummer ohne ausreichend Ziffern", () => {
    // Senioren-Kreis: alles unter 6 Ziffern ist definitiv keine echte Nummer
    expect(buildWhatsAppLink("12345")).toBeNull();
  });

  it("akzeptiert auch null/undefined als Input (defensive fuer DB-Rows)", () => {
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink(undefined)).toBeNull();
  });
});
