import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { verifyCronSecret } from "@/lib/security/cron-secret";
import { runQuartierEventsSync } from "@/modules/info-hub/services/quartier-events-sync.service";

/**
 * GET /api/cron/quartier-events-sync
 *
 * Projiziert vorhandene Quartier-Events in municipal_config.events.
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
    const result = await runQuartierEventsSync(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
