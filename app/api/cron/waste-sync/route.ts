// Cron-Route: Nightly Waste Sync
// Vercel Cron: täglich um 02:00 UTC
// Holt Termine aus allen konfigurierten Quellen und aktualisiert waste_collection_dates

import { NextResponse } from "next/server";
import { runWasteSync } from "@/modules/waste";

export const runtime = "nodejs";
export const maxDuration = 60; // Max 60 Sekunden

export async function GET(request: Request) {
  // Cron-Secret prüfen
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[waste-sync] CRON_SECRET nicht gesetzt");
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    console.log("[waste-sync] Starte Sync...");
    const result = await runWasteSync();

    console.log(
      `[waste-sync] Fertig: ${result.synced} Quellen synchronisiert`,
      JSON.stringify(
        result.results.map((r) => ({
          source: r.source_slug,
          status: r.status,
          inserted: r.dates_inserted,
          updated: r.dates_updated,
          cancelled: r.dates_cancelled,
        })),
      ),
    );

    return NextResponse.json({
      success: true,
      synced: result.synced,
      results: result.results,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[waste-sync] Fehler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unbekannter Fehler",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
