// GET /api/cron/retention-cleanup — DSGVO Retention-Automation
// Loescht Daten die ihre Aufbewahrungsfrist ueberschritten haben
// Vercel Cron: woechentlich Sonntag 2:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runRetentionCleanup } from "@/lib/services/cron-retention-cleanup.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/retention-cleanup] CRON_SECRET nicht konfiguriert");
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
    const result = await runRetentionCleanup(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
