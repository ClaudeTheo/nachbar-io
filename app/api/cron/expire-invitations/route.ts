// app/api/cron/expire-invitations/route.ts
// Nachbar.io — Cron: Offene Einladungen nach 30 Tagen automatisch ablaufen lassen
// Vercel Cron: taeglich um 3:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// GET /api/cron/expire-invitations — Einladungen nach 30 Tagen ablaufen lassen
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen (PFLICHT)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET nicht konfiguriert — Endpoint gesperrt");
    return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const adminSupabase = getAdminSupabase();

    // Alle offenen Einladungen aelter als 30 Tage auf 'expired' setzen
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await adminSupabase
      .from("neighbor_invitations")
      .update({ status: "expired" })
      .eq("status", "sent")
      .lt("created_at", thirtyDaysAgo.toISOString())
      .select("id");

    if (error) {
      console.error("Einladungs-Ablauf fehlgeschlagen:", error);
      return NextResponse.json(
        { error: "Datenbankfehler beim Ablauf der Einladungen" },
        { status: 500 }
      );
    }

    const expiredCount = data?.length ?? 0;

    console.log(`Einladungs-Ablauf: ${expiredCount} Einladung(en) abgelaufen`);

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Einladungs-Ablauf Cron-Fehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
