// app/api/care/cron/heartbeat-escalation/route.ts
// Nachbar.io — Heartbeat-Eskalation Cron-Route (alle 30 Minuten)

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { handleServiceError } from "@/lib/services/service-error";
import { runHeartbeatEscalation } from "@/modules/care/services/heartbeat-escalation.service";

// Re-Export für bestehende Tests
export { getEscalationStage } from "@/modules/care/services/heartbeat-escalation.service";

// GET /api/care/cron/heartbeat-escalation — Vercel Cron: alle 30 Minuten
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
    const result = await runHeartbeatEscalation(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
