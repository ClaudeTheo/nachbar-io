import { describe, expect, it } from "vitest";
import {
  MAP_STATUS_HELP_TEXT,
  MAP_STATUS_META,
  mergeMapStatus,
} from "@/lib/map-statuses";

describe("mergeMapStatus", () => {
  it("laesst hohe Prioritaet niedrigere Stati ueberschreiben", () => {
    expect(mergeMapStatus("green", "orange")).toBe("orange");
    expect(mergeMapStatus("orange", "blue")).toBe("blue");
    expect(mergeMapStatus("blue", "yellow")).toBe("yellow");
    expect(mergeMapStatus("yellow", "red")).toBe("red");
  });

  it("behaelt einen hoeher priorisierten Status", () => {
    expect(mergeMapStatus("red", "yellow")).toBe("red");
    expect(mergeMapStatus("yellow", "blue")).toBe("yellow");
  });
});

describe("MAP_STATUS_META", () => {
  it("liefert die neue Karten-Semantik fuer SOS und Hilfe", () => {
    expect(MAP_STATUS_META.red.chipLabel).toBe("SOS");
    expect(MAP_STATUS_META.red.statusLabel).toBe("SOS / kritisch");
    expect(MAP_STATUS_META.yellow.chipLabel).toBe("Hilfe");
    expect(MAP_STATUS_META.yellow.statusLabel).toBe("Hilfe gesucht");
  });

  it("beschreibt die Legende fuer den Hilfetext", () => {
    expect(MAP_STATUS_HELP_TEXT).toContain("SOS = Notfall oder kritische Meldung.");
    expect(MAP_STATUS_HELP_TEXT).toContain("Hilfe = Bewohner braucht Unterstuetzung.");
  });
});
