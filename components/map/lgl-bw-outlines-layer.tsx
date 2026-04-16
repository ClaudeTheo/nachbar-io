"use client";

import { WMSTileLayer } from "react-leaflet";
import { useFeatureFlag } from "@/lib/feature-flags";
import type { UserContext } from "@/lib/feature-flags";

export function LglBwOutlinesLayer({ userCtx }: { userCtx: UserContext }) {
  const enabled = useFeatureFlag("LGL_BW_BUILDING_OUTLINES_ENABLED", userCtx);

  if (!enabled) {
    return null;
  }

  return (
    <WMSTileLayer
      url="https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Hausumringe"
      layers="Hausumringe"
      format="image/png"
      transparent={true}
      version="1.3.0"
      opacity={0.7}
      zIndex={400}
      attribution='&copy; <a href="https://www.lgl-bw.de" target="_blank" rel="noreferrer">LGL Baden-Wuerttemberg</a>'
    />
  );
}
