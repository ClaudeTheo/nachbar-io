// modules/doctors/services/doctor-discovery.service.ts
// Nachbar.io — Apply-Service fuer die Doctor-Discovery-Welle.
//
// Workflow:
//   1. OSM fragen (osm-doctors-client) im Radius rund um Quartier-Zentrum.
//   2. Upsert in external_doctors (per quarter_id + source + source_ref).
//   3. last_seen_at aktualisieren bei bestehenden Eintraegen.
//   4. Eintraege, die >35 Tage NICHT mehr gesehen wurden, auf visible=false.
//   5. Report zurueckgeben (inserted, updated, hidden, total).
//
// Aufrufer:
//   - app/api/admin/quarters/[id]/onboard/route.ts (initialer Pull)
//   - app/api/cron/doctors-refresh/route.ts (monatlich)
//
// Founder-Entscheidungen 2026-05-11 (siehe Plan):
//   - 3a+c: Initial-Pull beim Onboarding + monatlicher Cron-Refresh.
//   - 35-Tage-Grace verhindert flackernde Sichtbarkeit bei Overpass-Outages
//     (Cron laeuft 1x/Monat → 30 Tage Mindestabstand + 5 Tage Toleranz).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchDoctorsFromOSM,
  type OsmDoctorCandidate,
} from "@/lib/doctors/osm-doctors-client";

const DEFAULT_RADIUS_KM = 10;
const HIDE_AFTER_DAYS = 35;

export interface DoctorDiscoveryReport {
  quarterId: string;
  inserted: number;
  updated: number;
  hidden: number;
  total: number;
  errors: string[];
}

interface DiscoverOptions {
  radiusKm?: number;
  /** Override Overpass-Fetch fuer Tests */
  fetchImpl?: typeof fetch;
  /** Override Now-Timestamp fuer Tests */
  now?: Date;
  /** Skip OSM-Call (z.B. fuer Test mit injizierten Kandidaten) */
  candidates?: OsmDoctorCandidate[];
}

/**
 * Pullt OSM-Aerzte fuer ein Quartier und persistiert sie in external_doctors.
 *
 * @param adminDb Service-Role Supabase-Client (RLS umgehen)
 * @param quarterId Ziel-Quartier
 * @param centerLat / centerLng Quartier-Zentrum
 * @param options.radiusKm Suchradius (Default 10 km)
 * @param options.fetchImpl Fetch-Override fuer Tests
 * @param options.candidates Bypass OSM-Call (Tests)
 */
export async function discoverDoctorsForQuarter(
  adminDb: SupabaseClient,
  quarterId: string,
  centerLat: number,
  centerLng: number,
  options: DiscoverOptions = {},
): Promise<DoctorDiscoveryReport> {
  const report: DoctorDiscoveryReport = {
    quarterId,
    inserted: 0,
    updated: 0,
    hidden: 0,
    total: 0,
    errors: [],
  };

  // 1. OSM-Kandidaten laden
  let candidates: OsmDoctorCandidate[];
  try {
    candidates =
      options.candidates ??
      (await fetchDoctorsFromOSM(
        centerLat,
        centerLng,
        options.radiusKm ?? DEFAULT_RADIUS_KM,
        options.fetchImpl,
      ));
  } catch (err) {
    report.errors.push(
      `OSM-Fetch fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
    );
    return report;
  }

  report.total = candidates.length;
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  // 2. Bestehende source_refs im DB-Stand laden, um insert vs update zu unterscheiden
  const sourceRefs = candidates.map((c) => c.source_ref);
  let existingRefs = new Set<string>();
  if (sourceRefs.length > 0) {
    const { data: existing, error: existingErr } = await adminDb
      .from("external_doctors")
      .select("source_ref")
      .eq("quarter_id", quarterId)
      .eq("source", "osm")
      .in("source_ref", sourceRefs);
    if (existingErr) {
      report.errors.push(
        `Bestehende Eintraege laden: ${existingErr.message}`,
      );
    } else {
      existingRefs = new Set((existing ?? []).map((r) => r.source_ref));
    }
  }

  // 3. Upsert
  if (candidates.length > 0) {
    const rows = candidates.map((c) => ({
      quarter_id: quarterId,
      source: c.source,
      source_ref: c.source_ref,
      name: c.name,
      specialization: c.specialization,
      address: c.address,
      phone: c.phone,
      website: c.website,
      email: c.email,
      latitude: c.latitude,
      longitude: c.longitude,
      distance_km: c.distance_km,
      last_seen_at: nowIso,
      visible: true,
    }));

    const { error: upsertErr } = await adminDb
      .from("external_doctors")
      .upsert(rows, {
        onConflict: "quarter_id,source,source_ref",
      });

    if (upsertErr) {
      report.errors.push(`Upsert: ${upsertErr.message}`);
    } else {
      for (const c of candidates) {
        if (existingRefs.has(c.source_ref)) {
          report.updated += 1;
        } else {
          report.inserted += 1;
        }
      }
    }
  }

  // 4. Stale-Pruning: Eintraege die in HIDE_AFTER_DAYS NICHT mehr gesehen wurden
  const cutoff = new Date(now.getTime() - HIDE_AFTER_DAYS * 86400 * 1000);
  const { data: hidden, error: pruneErr } = await adminDb
    .from("external_doctors")
    .update({ visible: false })
    .eq("quarter_id", quarterId)
    .eq("source", "osm")
    .eq("visible", true)
    .lt("last_seen_at", cutoff.toISOString())
    .select("id");

  if (pruneErr) {
    report.errors.push(`Pruning: ${pruneErr.message}`);
  } else {
    report.hidden = hidden?.length ?? 0;
  }

  return report;
}
