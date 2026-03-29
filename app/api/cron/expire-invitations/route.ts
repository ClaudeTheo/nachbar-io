// app/api/cron/expire-invitations/route.ts
// Nachbar.io — Cron: Offene Einladungen nach 30 Tagen automatisch ablaufen lassen
// Vercel Cron: täglich um 3:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runExpireInvitationsCron } from "@/lib/services/cron-expire-invitations.service";
import { handleServiceError } from "@/lib/services/service-error";

// GET /api/cron/expire-invitations — Einladungen nach 30 Tagen ablaufen lassen
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET prüfen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — Endpoint gesperrt");
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
    const result = await runExpireInvitationsCron(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
