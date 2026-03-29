// Cron-Route: Amtsblatt-Sync
// Vercel Cron: samstags um 08:00 UTC
// Thin wrapper — Business-Logik in lib/services/amtsblatt-sync.service.ts

import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runAmtsblattSync } from "@/lib/services/amtsblatt-sync.service";
import { handleServiceError } from "@/lib/services/service-error";

export const runtime = "nodejs";
export const maxDuration = 120; // PDF-Download + KI braucht Zeit

const LOG_PREFIX = "[amtsblatt-sync]";

export async function GET(request: Request) {
  // Cron-Secret prüfen
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET nicht gesetzt`);
    return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const result = await runAmtsblattSync(supabase);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
