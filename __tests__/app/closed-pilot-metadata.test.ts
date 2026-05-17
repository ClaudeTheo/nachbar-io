import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Nunito: () => ({ variable: "font-heading" }),
  Nunito_Sans: () => ({ variable: "font-sans" }),
}));

import { metadata } from "@/app/layout";

describe("Closed-Pilot-Metadaten", () => {
  it("beschreibt keine oeffentlich freigeschaltete Produktseite", () => {
    // Seit 2026-05-17 ist `title` ein Template-Objekt: Pages, die keinen
    // eigenen Title setzen, erben `default`; andere kriegen den `template`-
    // Suffix " — QuartierApp" automatisch dran.
    expect(metadata.title).toMatchObject({
      default: "QuartierApp — Geschlossener Pilot",
      template: "%s — QuartierApp",
    });
    expect(metadata.description).toContain("nicht öffentlich freigeschaltet");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
  });
});
