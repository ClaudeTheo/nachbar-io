// W8 (Befund A3:4 Teil 3): Server-Fehlertexte duerfen auf der Senior-Flaeche
// nicht 1:1 ankommen (kein "Abo-Plan/upgraden", kein "Einwilligung
// erforderlich" ohne Loesungsweg). Mapping ist maschinenlesbar ueber
// res.status + requiredFeature — KEIN String-Matching auf Server-Texte.

import { describe, it, expect } from "vitest";
import { mapSosErrorForSenior } from "./sos-error-messages";

describe("mapSosErrorForSenior (W8, A3:4)", () => {
  it("403 mit requiredFeature (Abo-Gate) → ruhiger Satz ohne Upsell-Sprache", () => {
    const text = mapSosErrorForSenior(403, {
      error: "Ihr Abo-Plan unterstützt diese SOS-Kategorie nicht. Bitte upgraden Sie Ihren Plan.",
      requiredFeature: "sos_all",
    });
    expect(text).not.toMatch(/Abo|upgrad/i);
    expect(text).toMatch(/Familie/);
  });

  it("403 ohne requiredFeature (Einwilligung) → Satz mit Loesungsweg", () => {
    const text = mapSosErrorForSenior(403, { error: "Einwilligung erforderlich" });
    expect(text).not.toContain("Einwilligung erforderlich");
    expect(text).toMatch(/Familie/);
  });

  it("alle anderen Fehler → ruhiger Standardsatz", () => {
    expect(mapSosErrorForSenior(500, { error: "Interner Fehler" })).toMatch(
      /nicht geklappt.*noch einmal/i,
    );
    expect(mapSosErrorForSenior(400, null)).toMatch(/nicht geklappt/i);
  });

  it("leakt nie den Server-Fehlertext durch", () => {
    const text = mapSosErrorForSenior(400, {
      error: "Ungültige Kategorie: xyz. Erlaubt: medical_emergency, general_help",
    });
    expect(text).not.toContain("Ungültige Kategorie");
    expect(text).not.toContain("medical_emergency");
  });
});
