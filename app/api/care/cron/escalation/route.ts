// app/api/care/cron/escalation/route.ts
// Nachbar.io — SOS-Eskalations-Cron (Vercel Cron: jede Minute)

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runEscalationCron } from "@/modules/care/services/cron-escalation.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen
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
    const result = await runEscalationCron(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
