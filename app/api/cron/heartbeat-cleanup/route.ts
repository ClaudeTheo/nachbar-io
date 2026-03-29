// app/api/cron/heartbeat-cleanup/route.ts
// Nachbar.io — Heartbeat-Cleanup: Loescht Heartbeats aelter als 90 Tage
// Vercel Cron: wöchentlich Sonntag 3:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runHeartbeatCleanup } from "@/lib/services/cron-heartbeat-cleanup.service";
import { handleServiceError } from "@/lib/services/service-error";

// GET /api/cron/heartbeat-cleanup — Alte Heartbeats löschen (90-Tage-Retention)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "[cron/heartbeat-cleanup] CRON_SECRET nicht konfiguriert — Endpoint gesperrt",
    );
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runHeartbeatCleanup(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
