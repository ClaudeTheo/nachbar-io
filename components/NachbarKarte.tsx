"use client";

import { useQuarter } from "@/lib/quarters";
import { isGeoQuarter } from "@/lib/map-houses";
import { LeafletKarte } from "@/components/LeafletKarte";
import { NachbarKarteSvg } from "@/components/NachbarKarteSvg";

interface NachbarKarteProps {
  quarterId?: string;
}

// Router: Leaflet für Geo-Quartiere (Laufenburg etc.), SVG für Legacy (Bad Säckingen)
export function NachbarKarte({ quarterId }: NachbarKarteProps) {
  const { currentQuarter } = useQuarter();
  const mapConfig = currentQuarter?.map_config;

  if (isGeoQuarter(mapConfig)) {
    return <LeafletKarte quarterId={quarterId} />;
  }

  return <NachbarKarteSvg quarterId={quarterId} />;
}
