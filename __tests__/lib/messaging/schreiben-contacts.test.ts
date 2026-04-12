// __tests__/lib/messaging/schreiben-contacts.test.ts
// Task H-1 → H-2: Transformer der entschluesselten CareProfile.emergency_contacts
// in die Zeilen-Struktur fuer den /schreiben-Senior-Screen umwandelt.
//
// Pure Funktion — kein Supabase, kein Decrypt. Die Eingabe wird bereits
// entschluesselt uebergeben (siehe getCareProfile in profile.service.ts).

import { describe, it, expect } from "vitest";
import { toSchreibenContacts } from "@/lib/messaging/schreiben-contacts";
import type { EmergencyContact } from "@/lib/care/types";

function contact(overrides: Partial<EmergencyContact> = {}): EmergencyContact {
  return {
    name: "Anna Muster",
    phone: "+49 176 12345678",
    role: "relative",
    priority: 1,
    relationship: "Tochter",
    ...overrides,
  };
}

describe("toSchreibenContacts (H-1 → H-2)", () => {
  it("liefert eine leere Liste zurueck wenn keine Kontakte vorhanden sind", () => {
    expect(toSchreibenContacts([])).toEqual([]);
  });

  it("mappt Name, Beziehung, phone und index fuer einen gueltigen Kontakt", () => {
    const result = toSchreibenContacts([contact()]);
    expect(result).toEqual([
      {
        name: "Anna Muster",
        relationship: "Tochter",
        phone: "+49 176 12345678",
        index: 0,
      },
    ]);
  });

  it("sortiert mehrere Kontakte aufsteigend nach priority (1 = wichtigste zuerst)", () => {
    const result = toSchreibenContacts([
      contact({ name: "Carla", priority: 3 }),
      contact({ name: "Anna", priority: 1 }),
      contact({ name: "Berta", priority: 2 }),
    ]);
    expect(result.map((c) => c.name)).toEqual(["Anna", "Berta", "Carla"]);
  });

  it("setzt phone auf null wenn die Nummer ungueltig ist (Kachel wird spaeter ausgegraut)", () => {
    const result = toSchreibenContacts([
      contact({ name: "Ohne Nummer", phone: "" }),
    ]);
    expect(result[0]!.phone).toBeNull();
    expect(result[0]!.name).toBe("Ohne Nummer");
  });

  it("behaelt stabile Reihenfolge bei gleicher priority (Eingabe-Reihenfolge als Tiebreaker)", () => {
    const result = toSchreibenContacts([
      contact({ name: "Erster", priority: 1 }),
      contact({ name: "Zweiter", priority: 1 }),
      contact({ name: "Dritter", priority: 1 }),
    ]);
    expect(result.map((c) => c.name)).toEqual(["Erster", "Zweiter", "Dritter"]);
  });

  it("weist fortlaufende Indizes nach Sortierung zu", () => {
    const result = toSchreibenContacts([
      contact({ name: "Carla", priority: 3 }),
      contact({ name: "Anna", priority: 1 }),
      contact({ name: "Berta", priority: 2 }),
    ]);
    expect(result.map((c) => c.index)).toEqual([0, 1, 2]);
  });
});
