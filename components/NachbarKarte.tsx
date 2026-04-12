"use client";

import { useQuarter } from "@/lib/quarters";
import { isGeoQuarter } from "@/lib/map-houses";
import { LeafletKarte } from "@/components/LeafletKarte";
import { NachbarKarteSvg } from "@/components/NachbarKarteSvg";

interface NachbarKarteProps {
  quarterId?: string;
}

// Router: Leaflet wenn Geo-Quartier ODER center_lat/lng vorhanden, sonst SVG-Fallback
export function NachbarKarte({ quarterId }: NachbarKarteProps) {
  const { currentQuarter } = useQuarter();
  const mapConfig = currentQuarter?.map_config;

  // Leaflet wenn explizit konfiguriert oder Geo-Koordinaten vorhanden
  if (
    isGeoQuarter(mapConfig) ||
    (currentQuarter?.center_lat && currentQuarter?.center_lng)
  ) {
    return <LeafletKarte quarterId={quarterId} />;
  }

  return <NachbarKarteSvg quarterId={quarterId} />;
}
