// Bad-Saeckingen hat 2026 die Website-Pfade von /de/... auf /rathaus-service/...
// umgestellt. Diese Normalisierung haelt bestehende municipal_config-Links nutzbar.

const BAD_SAECKINGEN_URL_REPLACEMENTS = new Map<string, string>([
  [
    "https://www.bad-saeckingen.de/de/rathaus-verwaltung/maengelmelder",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/maengelmeldung",
  ],
  [
    "https://www.bad-saeckingen.de/de/rathaus-verwaltung/formulare",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
  ],
  [
    "https://www.bad-saeckingen.de/de/rathaus-verwaltung/gemeinderat",
    "https://www.bad-saeckingen.de/rathaus-service/gemeinderat/ratsinfosystem",
  ],
  [
    "https://www.bad-saeckingen.de/de/tourismus-freizeit/veranstaltungen",
    "https://www.bad-saeckingen.de/leben-wohnen/veranstaltungen",
  ],
  [
    "https://www.bad-saeckingen.de/de/leben-wohnen/senioren",
    "https://www.bad-saeckingen.de/rathaus-service/gremien/seniorenrat",
  ],
  [
    "https://www.bad-saeckingen.de/de/leben-wohnen/pflege",
    "https://www.landkreis-waldshut.de/sozialamt/abteilungen/altenhilfe/pflegestuetzpunkt/",
  ],
]);

export function normalizeBadSaeckingenUrl(url: string): string {
  return BAD_SAECKINGEN_URL_REPLACEMENTS.get(url) ?? url;
}

export function normalizeBadSaeckingenLinks<T extends { url: string }>(
  links: T[],
): T[] {
  return links.map((link) => ({
    ...link,
    url: normalizeBadSaeckingenUrl(link.url),
  }));
}
