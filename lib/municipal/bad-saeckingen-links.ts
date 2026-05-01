// Bad-Saeckingen hat 2026 die Website-Pfade von /de/... auf /rathaus-service/...
// umgestellt. Diese Normalisierung haelt bestehende municipal_config-Links nutzbar.

import type { ServiceLink, WikiEntry } from "./types";

const BAD_SAECKINGEN_URL_REPLACEMENTS = new Map<string, string>([
  [
    "https://www.bad-saeckingen.de/kontakt",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
  ],
  [
    "https://www.bad-saeckingen.de/buergerbuero",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo",
  ],
  [
    "https://www.bad-saeckingen.de/standesamt",
    "https://www.bad-saeckingen.de/rathaus-service/verwaltungsaufbau/alle-fachbereiche/personenstandswesen",
  ],
  [
    "https://www.bad-saeckingen.de/fundbuero",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/behoerden-dienstleistungen/6000959/fundsache-abgeben-oder-nachfragen",
  ],
  [
    "https://www.bad-saeckingen.de/formulare",
    "https://www.bad-saeckingen.de/rathaus-service/buergerservice/formulare-onlinedienste",
  ],
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

export function normalizeBadSaeckingenServiceLinks(
  links: ServiceLink[],
): ServiceLink[] {
  return normalizeBadSaeckingenLinks(links);
}

export function normalizeBadSaeckingenWikiEntries(
  entries: WikiEntry[],
): WikiEntry[] {
  return entries.map((entry) => ({
    ...entry,
    links: entry.links ? normalizeBadSaeckingenLinks(entry.links) : entry.links,
  }));
}
