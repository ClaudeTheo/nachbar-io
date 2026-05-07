import type { ServiceLink } from "./types";
import { normalizeBadSaeckingenServiceLinks } from "./bad-saeckingen-links";

export interface MunicipalServiceLinkDefaultsInput {
  cityName: string;
  rathausUrl: string | null | undefined;
}

export function normalizeMunicipalWebsiteUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.protocol = "https:";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function toMunicipalConfigArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toServiceLinkArray(value: unknown): ServiceLink[] {
  return toMunicipalConfigArray<ServiceLink>(value);
}

export function buildMunicipalServiceLinks({
  cityName,
  rathausUrl,
}: MunicipalServiceLinkDefaultsInput): ServiceLink[] {
  const baseUrl = normalizeMunicipalWebsiteUrl(rathausUrl);
  if (!baseUrl) return [];

  return normalizeBadSaeckingenServiceLinks([
    {
      label: `Rathaus ${cityName.trim() || "Ihre Kommune"}`,
      url: baseUrl,
      icon: "building",
      category: "kontakt",
    },
    {
      label: "Bürgerbüro",
      url: `${baseUrl}/buergerbuero`,
      icon: "users",
      category: "kontakt",
    },
    {
      label: "Formulare & Anträge",
      url: `${baseUrl}/formulare`,
      icon: "clipboard",
      category: "formulare",
    },
    {
      label: "Veranstaltungskalender",
      url: `${baseUrl}/veranstaltungen`,
      icon: "calendar",
      category: "service",
    },
    {
      label: "Abfallwirtschaft",
      url: `${baseUrl}/abfall`,
      icon: "trash",
      category: "service",
    },
  ]);
}
