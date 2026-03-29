// app/api/cron/analytics/route.ts
// Nachbar.io — Analytics Cron: Berechnet täglich KPI-Snapshots pro Quartier
// Vercel Cron: täglich um 3:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runAnalyticsCron } from "@/lib/services/cron-analytics.service";
import { handleServiceError } from "@/lib/services/service-error";

// GET /api/cron/analytics — Täglich KPI-Snapshots berechnen und speichern
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "[cron/analytics] CRON_SECRET nicht konfiguriert — Endpoint gesperrt",
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
    const result = await runAnalyticsCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
