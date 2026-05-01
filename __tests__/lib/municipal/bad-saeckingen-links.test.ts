import { describe, expect, it } from "vitest";
import {
  normalizeBadSaeckingenLinks,
  normalizeBadSaeckingenUrl,
} from "@/lib/municipal";
import { RATHAUS_LINKS } from "@/modules/info-hub/services/rathaus-links";

describe("Bad-Saeckingen-Link-Normalisierung", () => {
  it("ersetzt alte Rathaus-Pfade durch aktuelle offizielle URLs", () => {
    expect(
      normalizeBadSaeckingenUrl(
        "https://www.bad-saeckingen.de/de/rathaus-verwaltung/maengelmelder",
      ),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/buergerservice/maengelmeldung",
    );

    expect(
      normalizeBadSaeckingenUrl(
        "https://www.bad-saeckingen.de/de/rathaus-verwaltung/gemeinderat",
      ),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/gemeinderat/ratsinfosystem",
    );
  });

  it("laesst unbekannte URLs unveraendert", () => {
    expect(normalizeBadSaeckingenUrl("https://example.org/service")).toBe(
      "https://example.org/service",
    );
  });

  it("normalisiert Listen ohne andere Felder zu verlieren", () => {
    const links = normalizeBadSaeckingenLinks([
      {
        label: "Formulare",
        category: "verwaltung",
        url: "https://www.bad-saeckingen.de/de/rathaus-verwaltung/formulare",
      },
    ]);

    expect(links).toEqual([
      {
        label: "Formulare",
        category: "verwaltung",
        url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
      },
    ]);
  });

  it("enthaelt keine alten /de/ Rathaus-URLs mehr in den statischen Links", () => {
    expect(RATHAUS_LINKS).toHaveLength(6);
    expect(RATHAUS_LINKS.map((link) => link.url)).not.toContain(
      "https://www.bad-saeckingen.de/de/rathaus-verwaltung/maengelmelder",
    );
    for (const link of RATHAUS_LINKS) {
      expect(link.url).not.toContain("bad-saeckingen.de/de/");
    }
  });
});
