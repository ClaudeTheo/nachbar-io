// app/api/cron/osm-poi-sync/route.ts
// Nachbar.io — Holt Apotheken-POIs aus OSM Overpass und schreibt sie in municipal_config.
// Vercel-Cron: woechentlich Sonntag 03:00 UTC.

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { runOsmPoiSync } from "@/modules/info-hub/services/osm-poi-sync.service";

export const GET = withCronHeartbeat("osm_poi_sync", async (supabase) => {
  return await runOsmPoiSync(supabase);
});
