const SVG_MAP_SLUGS = new Set(["bad-saeckingen", "pilotquartier"]);

export function hasQuarterSvgMap({
  slug,
  mapHouseCount,
}: {
  slug?: string | null;
  mapHouseCount?: number | null;
}): boolean {
  if ((mapHouseCount ?? 0) > 0) {
    return true;
  }

  return Boolean(slug && SVG_MAP_SLUGS.has(slug));
}

export function getMapPositionEmptyState({
  isAuthenticated,
  householdLinked,
  addressLabel,
}: {
  isAuthenticated: boolean;
  householdLinked: boolean;
  addressLabel?: string | null;
}): { title: string; body: string } {
  if (!isAuthenticated) {
    return {
      title: "Anmeldung erforderlich",
      body: "Bitte melden Sie sich an, um Ihre Kartenposition zu bearbeiten.",
    };
  }

  if (addressLabel) {
    return {
      title: "Adresse noch nicht auf der Karte",
      body: `${addressLabel} ist auf der Quartierskarte noch nicht hinterlegt.`,
    };
  }

  if (householdLinked) {
    return {
      title: "Haushalt noch nicht auf der Karte",
      body: "Ihr Haushalt ist verknüpft, auf der Kartenansicht aber noch nicht verfügbar.",
    };
  }

  return {
    title: "Kein Haushalt zugeordnet",
    body: "Für dieses Konto ist aktuell kein verifizierter Haushalt hinterlegt.",
  };
}
