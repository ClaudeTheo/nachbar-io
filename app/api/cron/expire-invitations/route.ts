// app/api/cron/expire-invitations/route.ts
// Nachbar.io — Cron: Offene Einladungen nach 30 Tagen automatisch ablaufen lassen
// Vercel Cron: taeglich um 3:00 Uhr

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-Role Client fuer Admin-Operationen (kein User-Context noetig)
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert");
  }
  return createClient(url, key);
}

// GET /api/cron/expire-invitations — Einladungen nach 30 Tagen ablaufen lassen
export async function GET(request: NextRequest) {
  // Cron-Auth: Authorization-Header gegen CRON_SECRET pruefen
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
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
