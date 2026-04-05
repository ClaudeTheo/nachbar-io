import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runQuartierInfoSync } from "@/modules/info-hub/services/quartier-info-sync.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * GET /api/cron/quartier-info-sync
 *
 * Holt Wetter- und Pollendaten fuer alle aktiven Quartiere.
 * Vercel Cron: Stuendlich (0 * * * *)
 * Pollen wird nur 1x/Tag aktualisiert.
 */
export async function GET(request: Request) {
  // Cron-Secret pruefen (PFLICHT — blockiert wenn Secret fehlt)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runQuartierInfoSync(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
