// POST /api/cron/plus-trial-expiry — Plus-Trial Ablauf + Reminder
// Cron-tauglich: Admin-Supabase, kein User-Context
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { processTrialExpiries } from "@/modules/praevention/services/reward.service";

export async function POST(request: NextRequest) {
  // CRON_SECRET pruefen (PFLICHT — blockiert wenn Secret fehlt)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await processTrialExpiries(supabase);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
