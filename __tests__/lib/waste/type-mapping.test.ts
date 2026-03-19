import { describe, it, expect } from "vitest";
import { mapWasteType, extractWasteTypeFromSummary } from "@/lib/waste/type-mapping";

describe("mapWasteType", () => {
  it("mappt exakte deutsche Bezeichnungen", () => {
    expect(mapWasteType("Restmüll")).toBe("restmuell");
    expect(mapWasteType("Biotonne")).toBe("biomuell");
    expect(mapWasteType("Papier")).toBe("papier");
    expect(mapWasteType("Gelber Sack")).toBe("gelber_sack");
    expect(mapWasteType("Grünschnitt")).toBe("gruenschnitt");
    expect(mapWasteType("Sperrmüll")).toBe("sperrmuell");
  });

  it("mappt case-insensitive", () => {
    expect(mapWasteType("RESTMÜLL")).toBe("restmuell");
    expect(mapWasteType("restmüll")).toBe("restmuell");
    expect(mapWasteType("Restmüll")).toBe("restmuell");
  });

  it("mappt Aliase", () => {
    expect(mapWasteType("Restabfall")).toBe("restmuell");
    expect(mapWasteType("Hausmüll")).toBe("restmuell");
    expect(mapWasteType("Bioabfall")).toBe("biomuell");
    expect(mapWasteType("Altpapier")).toBe("papier");
    expect(mapWasteType("Blaue Tonne")).toBe("papier");
    expect(mapWasteType("Gelbe Tonne")).toBe("gelber_sack");
    expect(mapWasteType("Wertstoffe")).toBe("gelber_sack");
    expect(mapWasteType("Gartenabfall")).toBe("gruenschnitt");
    expect(mapWasteType("Sperrgut")).toBe("sperrmuell");
  });

  it("mappt neue Typen", () => {
    expect(mapWasteType("Altglas")).toBe("altglas");
    expect(mapWasteType("Elektroschrott")).toBe("elektroschrott");
    expect(mapWasteType("Schadstoffsammlung")).toBe("sondermuell");
  });

  it("gibt null bei unbekannten Typen", () => {
    expect(mapWasteType("Weihnachtsbaum")).toBeNull();
    expect(mapWasteType("")).toBeNull();
    expect(mapWasteType("Sonstiges")).toBeNull();
  });

  it("trimmt Whitespace", () => {
    expect(mapWasteType("  Restmüll  ")).toBe("restmuell");
  });

  it("mappt Substring-Matches", () => {
    expect(mapWasteType("Leerung Biotonne")).toBe("biomuell");
    expect(mapWasteType("Abholung Gelber Sack")).toBe("gelber_sack");
  });
});

describe("extractWasteTypeFromSummary", () => {
  it("extrahiert aus einfachen Summaries", () => {
    expect(extractWasteTypeFromSummary("Restmüll")).toBe("restmuell");
    expect(extractWasteTypeFromSummary("Biotonne")).toBe("biomuell");
  });

  it("ignoriert Klammer-Inhalt", () => {
    expect(extractWasteTypeFromSummary("Biotonne (14-tägl.)")).toBe("biomuell");
    expect(extractWasteTypeFromSummary("Restmüll (alle 2 Wochen)")).toBe("restmuell");
  });

  it("extrahiert aus zusammengesetzten Summaries", () => {
    expect(extractWasteTypeFromSummary("Gelber Sack - Abholung")).toBe("gelber_sack");
    expect(extractWasteTypeFromSummary("Leerung Papiertonne")).toBe("papier");
    expect(extractWasteTypeFromSummary("Abholung: Sperrmüll")).toBe("sperrmuell");
  });

  it("gibt null bei unbekannten Summaries", () => {
    expect(extractWasteTypeFromSummary("Weihnachtsbaum-Abholung")).toBeNull();
    expect(extractWasteTypeFromSummary("Feiertag")).toBeNull();
  });
});
