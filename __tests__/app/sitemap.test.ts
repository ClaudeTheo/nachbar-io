import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("enthaelt beide oeffentlichen Kontoloesch-Pfade fuer Store-Reviewer", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain("https://nachbar-io.vercel.app/account-loeschen");
    expect(urls).toContain("https://nachbar-io.vercel.app/konto-loeschen");
  });
});
