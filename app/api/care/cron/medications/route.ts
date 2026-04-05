// app/api/care/cron/medications/route.ts
// Nachbar.io — Medikamenten-Erinnerungs-Cron: Fällige Einnahmen erinnern und verpasste protokollieren (alle 5 Min)

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { runMedicationsCron } from "@/modules/care/services/cron-medications.service";

// GET /api/care/cron/medications — Medikamenten-Erinnerungs-Scheduler (Vercel Cron: alle 5 Minuten)
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — Cron-Endpunkt blockiert");
    return NextResponse.json(
      { error: "Server nicht konfiguriert" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runMedicationsCron(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
