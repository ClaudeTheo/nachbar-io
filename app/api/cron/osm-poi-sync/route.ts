import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { runOsmPoiSync } from "@/modules/info-hub/services/osm-poi-sync.service";
import { verifyCronSecret } from "@/lib/security/cron-secret";

/**
 * GET /api/cron/osm-poi-sync
 *
 * Holt Apotheken-POIs aus OSM Overpass und schreibt sie in municipal_config.
 * Noch nicht in vercel.json geplant; Aktivierung bleibt separates Founder-Go.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !verifyCronSecret(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runOsmPoiSync(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
