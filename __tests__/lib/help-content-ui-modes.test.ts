import { describe, expect, it } from "vitest";

import { HELP_CATEGORIES } from "@/lib/help-content";

describe("help content ui modes", () => {
  it("explains Aktiv 55+ separately from Einfach", () => {
    const flat = HELP_CATEGORIES.flatMap((category) => category.items)
      .map((item) => `${item.question} ${item.answer}`)
      .join("\n");

    expect(flat).toContain("Aktiv 55+");
    expect(flat).toContain("Einfach");
    expect(flat).toContain("Profil");
  });
});
