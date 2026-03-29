import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { runNinaSync } from "@/modules/info-hub/services/nina-sync.service";

/**
 * GET /api/cron/nina-sync
 *
 * Prueft NINA-Warnungen alle 5 Minuten.
 * Neue Warnungen werden gespeichert + Push bei Severe/Extreme.
 * Vercel Cron: Alle 5 Min (* /5 * * * *)
 */
export async function GET(request: Request) {
  // Cron-Secret pruefen
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runNinaSync(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
