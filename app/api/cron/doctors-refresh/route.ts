// app/api/cron/doctors-refresh/route.ts
// Nachbar.io — Welle Doctor-Discovery (Plan 2026-05-11) — monatlicher Refresh.
//
// Workflow:
//   - Holt alle aktiven Quartiere mit Center-Koordinaten.
//   - Ruft pro Quartier discoverDoctorsForQuarter (OSM Overpass).
//   - Mit 1.5s Pause zwischen Quartieren (Overpass-Convention 1 req/sec).
//
// Vercel Cron (siehe vercel.json) — 1x pro Monat (z.B. erster Tag 03:00 UTC).
//
// Cron-Heartbeat: nutzt withCronHeartbeat wie alle anderen Crons —
// trackt Erfolg/Fehler in cron_heartbeats Tabelle.

import { withCronHeartbeat } from "@/lib/care/with-cron-heartbeat";
import { discoverDoctorsForQuarter } from "@/modules/doctors/services/doctor-discovery.service";

interface QuarterRow {
  id: string;
  center_lat: number | null;
  center_lng: number | null;
}

interface RefreshSummary {
  ok: boolean;
  quartersProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalHidden: number;
  errors: string[];
}

export const GET = withCronHeartbeat<RefreshSummary>(
  "doctors_refresh",
  async (supabase): Promise<RefreshSummary> => {
    const { data: quarters, error } = await supabase
      .from("quarters")
      .select("id, center_lat, center_lng")
      .eq("status", "active");

    if (error) {
      return {
        ok: false,
        quartersProcessed: 0,
        totalInserted: 0,
        totalUpdated: 0,
        totalHidden: 0,
        errors: [`Quarters-Query: ${error.message}`],
      };
    }

    const rows = (quarters ?? []) as QuarterRow[];
    let inserted = 0;
    let updated = 0;
    let hidden = 0;
    const errors: string[] = [];
    let processed = 0;

    for (const row of rows) {
      if (row.center_lat == null || row.center_lng == null) {
        errors.push(`Quartier ${row.id}: keine Center-Koordinaten`);
        continue;
      }

      try {
        const report = await discoverDoctorsForQuarter(
          supabase,
          row.id,
          row.center_lat,
          row.center_lng,
        );
        inserted += report.inserted;
        updated += report.updated;
        hidden += report.hidden;
        if (report.errors.length > 0) {
          for (const e of report.errors) {
            errors.push(`Quartier ${row.id}: ${e}`);
          }
        }
        processed += 1;
      } catch (err) {
        errors.push(
          `Quartier ${row.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Overpass-Rate-Limit: 1.5s Pause zwischen Quartieren
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return {
      ok: errors.length === 0,
      quartersProcessed: processed,
      totalInserted: inserted,
      totalUpdated: updated,
      totalHidden: hidden,
      errors,
    };
  },
);
