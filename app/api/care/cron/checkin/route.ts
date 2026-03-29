// app/api/care/cron/checkin/route.ts
// Nachbar.io — Check-in Scheduler Cron (Vercel Cron: alle 5 Minuten)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCheckinCron } from "@/modules/care/services/cron-checkin.service";
import { handleServiceError } from "@/lib/services/service-error";

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
    const supabase = await createClient();
    const result = await runCheckinCron(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
