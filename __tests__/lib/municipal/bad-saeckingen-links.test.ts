import { describe, expect, it } from "vitest";
import {
  normalizeBadSaeckingenLinks,
  normalizeBadSaeckingenWikiEntries,
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

  it("ersetzt alte direkte Pilot-Seed-Pfade durch erreichbare offizielle URLs", () => {
    expect(
      normalizeBadSaeckingenUrl("https://www.bad-saeckingen.de/buergerbuero"),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo",
    );
    expect(
      normalizeBadSaeckingenUrl("https://www.bad-saeckingen.de/standesamt"),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/verwaltungsaufbau/alle-fachbereiche/personenstandswesen",
    );
    expect(
      normalizeBadSaeckingenUrl("https://www.bad-saeckingen.de/fundbuero"),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/buergerservice/behoerden-dienstleistungen/6000959/fundsache-abgeben-oder-nachfragen",
    );
    expect(
      normalizeBadSaeckingenUrl("https://www.bad-saeckingen.de/formulare"),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
    );
    expect(
      normalizeBadSaeckingenUrl("https://www.bad-saeckingen.de/kontakt"),
    ).toBe(
      "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
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

  it("normalisiert verschachtelte Wiki-Links ohne Eintragstext zu veraendern", () => {
    const entries = normalizeBadSaeckingenWikiEntries([
      {
        question: "Wo melde ich ein Schlagloch?",
        answer: "Beim Rathaus.",
        category: "infrastruktur",
        links: [
          {
            label: "Rathaus kontaktieren",
            url: "https://www.bad-saeckingen.de/kontakt",
          },
        ],
      },
    ]);

    expect(entries).toEqual([
      {
        question: "Wo melde ich ein Schlagloch?",
        answer: "Beim Rathaus.",
        category: "infrastruktur",
        links: [
          {
            label: "Rathaus kontaktieren",
            url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
          },
        ],
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
