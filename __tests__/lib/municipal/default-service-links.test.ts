import { describe, expect, it } from "vitest";
import {
  buildMunicipalServiceLinks,
  normalizeMunicipalWebsiteUrl,
  toMunicipalConfigArray,
} from "@/lib/municipal";

describe("Rathaus-Service-Link-Defaults", () => {
  it("normalisiert Rathaus-Domains auf HTTPS ohne trailing slash", () => {
    expect(normalizeMunicipalWebsiteUrl("laufenburg.de/")).toBe(
      "https://laufenburg.de",
    );
    expect(normalizeMunicipalWebsiteUrl("http://www.example.org/path/")).toBe(
      "https://www.example.org/path",
    );
  });

  it("baut ein konservatives Service-Link-Set aus Stadtname und Rathaus-URL", () => {
    expect(
      buildMunicipalServiceLinks({
        cityName: "Laufenburg (Baden)",
        rathausUrl: "https://www.laufenburg.de/",
      }),
    ).toEqual([
      {
        label: "Rathaus Laufenburg (Baden)",
        url: "https://www.laufenburg.de",
        icon: "building",
        category: "kontakt",
      },
      {
        label: "Bürgerbüro",
        url: "https://www.laufenburg.de/buergerbuero",
        icon: "users",
        category: "kontakt",
      },
      {
        label: "Formulare & Anträge",
        url: "https://www.laufenburg.de/formulare",
        icon: "clipboard",
        category: "formulare",
      },
      {
        label: "Veranstaltungskalender",
        url: "https://www.laufenburg.de/veranstaltungen",
        icon: "calendar",
        category: "service",
      },
      {
        label: "Abfallwirtschaft",
        url: "https://www.laufenburg.de/abfall",
        icon: "trash",
        category: "service",
      },
    ]);
  });

  it("nutzt Bad-Saeckingen-Link-Normalisierung fuer bekannte Sonderpfade", () => {
    const links = buildMunicipalServiceLinks({
      cityName: "Bad Säckingen",
      rathausUrl: "https://www.bad-saeckingen.de",
    });

    expect(links).toContainEqual({
      label: "Bürgerbüro",
      url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo",
      icon: "users",
      category: "kontakt",
    });
    expect(links).toContainEqual({
      label: "Formulare & Anträge",
      url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
      icon: "clipboard",
      category: "formulare",
    });
  });

  it("liefert eine leere Liste ohne verwertbare Rathaus-URL", () => {
    expect(
      buildMunicipalServiceLinks({
        cityName: "Teststadt",
        rathausUrl: "",
      }),
    ).toEqual([]);
  });

  it("behandelt nicht-array municipal_config Werte als leere Liste", () => {
    expect(toMunicipalConfigArray<{ label: string }>({ label: "Kaputt" })).toEqual(
      [],
    );
    expect(toMunicipalConfigArray<{ label: string }>(null)).toEqual([]);
    expect(toMunicipalConfigArray<{ label: string }>([{ label: "OK" }])).toEqual(
      [{ label: "OK" }],
    );
  });
});
