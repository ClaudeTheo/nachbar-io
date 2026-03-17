"use client";

import { useQuarter } from "@/lib/quarters";
import { isGeoQuarter } from "@/lib/map-houses";
import { LeafletKarte } from "@/components/LeafletKarte";
import { NachbarKarteSvg } from "@/components/NachbarKarteSvg";

interface NachbarKarteProps {
  quarterId?: string;
}

// Router: Leaflet fuer Geo-Quartiere (Laufenburg etc.), SVG fuer Legacy (Bad Saeckingen)
export function NachbarKarte({ quarterId }: NachbarKarteProps) {
  const { currentQuarter } = useQuarter();
  const mapConfig = currentQuarter?.map_config;

  if (isGeoQuarter(mapConfig)) {
    return <LeafletKarte quarterId={quarterId} />;
  }

  return <NachbarKarteSvg quarterId={quarterId} />;
}
