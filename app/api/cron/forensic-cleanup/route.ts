// app/api/cron/forensic-cleanup/route.ts
// Nachbar.io — Loescht abgelaufene Forensik-Daten (7-Tage-Retention)
// Vercel Cron: taeglich 4:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredForensics } from "@/lib/security/forensic-logger";

// GET /api/cron/forensic-cleanup — Abgelaufene Forensik-Records loeschen
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error(
      "[cron/forensic-cleanup] CRON_SECRET nicht konfiguriert — Endpoint gesperrt",
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
    const deletedCount = await cleanupExpiredForensics();
    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/forensic-cleanup] Fehler:", err);
    return NextResponse.json(
      { error: "Cleanup fehlgeschlagen" },
      { status: 500 },
    );
  }
}
