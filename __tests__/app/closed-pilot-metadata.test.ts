import { describe, expect, it } from "vitest";

import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Nunito: () => ({ variable: "font-heading" }),
  Nunito_Sans: () => ({ variable: "font-sans" }),
}));

import { metadata } from "@/app/layout";

describe("Closed-Pilot-Metadaten", () => {
  it("beschreibt keine oeffentlich freigeschaltete Produktseite", () => {
    expect(metadata.title).toBe("Nachbar.io — Geschlossener Pilot");
    expect(metadata.description).toContain("nicht öffentlich freigeschaltet");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
  });
});
