import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fetchDwdWarnings, normalizeDwdWarncellId } from "@/lib/integrations/dwd/client";
import { toCacheRow as dwdToCacheRow } from "@/lib/integrations/dwd/parser";
import { fetchNinaWarnings } from "@/lib/integrations/nina/client";
import { toCacheRow as ninaToCacheRow } from "@/lib/integrations/nina/parser";
import {
  fetchUbaAirQuality,
  fetchUbaStations,
  selectNearestBwStations,
} from "@/lib/integrations/uba/client";
import {
  parseLatestUbaMeasurement,
  toCacheRow as ubaToCacheRow,
} from "@/lib/integrations/uba/parser";
import type { UbaStation } from "@/lib/integrations/uba/types";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof getAdminSupabase>;
type QuarterRow = Pick<
  Database["public"]["Tables"]["quarters"]["Row"],
  "id" | "slug" | "bbk_ars" | "bw_ars" | "center_lat" | "center_lng"
>;
type CacheInsert =
  Database["public"]["Tables"]["external_warning_cache"]["Insert"];
type SyncLogInsert =
  Database["public"]["Tables"]["external_warning_sync_log"]["Insert"];
type Provider = "nina" | "dwd" | "uba";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const runtime = "nodejs";

const FLAG_BY_PROVIDER: Record<Provider, string> = {
  nina: "NINA_WARNINGS_ENABLED",
  dwd: "DWD_WEATHER_WARNINGS_ENABLED",
  uba: "UBA_AIR_QUALITY_ENABLED",
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/external-warnings] CRON_SECRET nicht konfiguriert");
    return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const admin = getAdminSupabase();
  const batchId = crypto.randomUUID();

  const providerEnabled = {
    nina: await isFeatureEnabledServer(admin, FLAG_BY_PROVIDER.nina),
    dwd: await isFeatureEnabledServer(admin, FLAG_BY_PROVIDER.dwd),
    uba: await isFeatureEnabledServer(admin, FLAG_BY_PROVIDER.uba),
  } as const;

  let ubaStations: UbaStation[] = [];
  let ubaStationsError: string | null = null;
  if (providerEnabled.uba) {
    try {
      ubaStations = await fetchUbaStations();
    } catch (error) {
      ubaStationsError =
        error instanceof Error ? error.message : String(error);
      console.error("[cron/external-warnings] UBA stations failed", error);
    }
  }

  const { data: quarters, error: quarterError } = await admin
    .from("quarters")
    .select("id, slug, bbk_ars, bw_ars, center_lat, center_lng")
    .eq("status", "active")
    .not("bbk_ars", "is", null);

  if (quarterError) {
    console.error("[cron/external-warnings] quarter load failed", quarterError);
    return NextResponse.json(
      { error: "Quartiere konnten nicht geladen werden" },
      { status: 500 },
    );
  }

  const results = await Promise.allSettled(
    (quarters ?? []).flatMap((quarter) => {
      const tasks: Array<Promise<ProviderRunResult>> = [];

      if (providerEnabled.nina) {
        tasks.push(syncNinaQuarter(admin, quarter, batchId));
      }

      if (providerEnabled.dwd) {
        tasks.push(syncDwdQuarter(admin, quarter, batchId));
      }

      if (providerEnabled.uba) {
        tasks.push(
          syncUbaQuarter(admin, quarter, batchId, ubaStations, ubaStationsError),
        );
      }

      return tasks;
    }),
  );

  return NextResponse.json({
    batchId,
    providerEnabled,
    results: results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { status: "error", error: String(result.reason) },
    ),
  });
}

interface ProviderRunResult {
  provider: Provider;
  quarter: string;
  fetched: number;
  inserted: number;
  unchanged: number;
  expired: number;
}

async function syncNinaQuarter(
  admin: AdminClient,
  quarter: QuarterRow,
  batchId: string,
): Promise<ProviderRunResult> {
  const ars = quarter.bbk_ars;

  if (!ars) {
    return {
      provider: "nina",
      quarter: quarter.slug,
      fetched: 0,
      inserted: 0,
      unchanged: 0,
      expired: 0,
    };
  }

  try {
    const ninaResult = await fetchNinaWarnings(ars);
    const rows = ninaResult.warnings.map((warning) =>
      ninaToCacheRow(warning, {
        quarterId: quarter.id,
        ars,
        batchId,
      }),
    );

    const summary = await persistProviderRows(admin, "nina", quarter, rows, {
      batchId,
      ars,
    });
    return { provider: "nina", quarter: quarter.slug, ...summary };
  } catch (error) {
    await writeSyncLog(admin, {
      batch_id: batchId,
      provider: "nina",
      quarter_id: quarter.id,
      ars,
      status: "error",
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function syncDwdQuarter(
  admin: AdminClient,
  quarter: QuarterRow,
  batchId: string,
): Promise<ProviderRunResult> {
  const ars = quarter.bw_ars ?? quarter.bbk_ars;

  if (!ars) {
    return {
      provider: "dwd",
      quarter: quarter.slug,
      fetched: 0,
      inserted: 0,
      unchanged: 0,
      expired: 0,
    };
  }

  const warncellId = normalizeDwdWarncellId(ars);

  try {
    const dwdResult = await fetchDwdWarnings(warncellId);
    const rows = dwdResult.warnings.map((warning) =>
      dwdToCacheRow(warning, {
        quarterId: quarter.id,
        ars,
        batchId,
        warncellId,
      }),
    );

    const summary = await persistProviderRows(admin, "dwd", quarter, rows, {
      batchId,
      ars,
      warncellId,
    });
    return { provider: "dwd", quarter: quarter.slug, ...summary };
  } catch (error) {
    await writeSyncLog(admin, {
      batch_id: batchId,
      provider: "dwd",
      quarter_id: quarter.id,
      ars,
      status: "error",
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function syncUbaQuarter(
  admin: AdminClient,
  quarter: QuarterRow,
  batchId: string,
  stations: UbaStation[],
  stationsError: string | null,
): Promise<ProviderRunResult> {
  const ars = quarter.bw_ars ?? quarter.bbk_ars;

  if (!ars) {
    return {
      provider: "uba",
      quarter: quarter.slug,
      fetched: 0,
      inserted: 0,
      unchanged: 0,
      expired: 0,
    };
  }

  if (stationsError) {
    await writeSyncLog(admin, {
      batch_id: batchId,
      provider: "uba",
      quarter_id: quarter.id,
      ars,
      status: "error",
      finished_at: new Date().toISOString(),
      error_message: stationsError,
    });
    throw new Error(stationsError);
  }

  try {
    const nearestStations = selectNearestBwStations(
      stations,
      {
        lat: quarter.center_lat,
        lng: quarter.center_lng,
      },
      3,
    );

    const stationResult = await findFirstStationWithData(nearestStations);
    const measurement = stationResult
      ? parseLatestUbaMeasurement(stationResult.payload, stationResult.station)
      : null;
    const row = measurement
      ? ubaToCacheRow(measurement, {
          quarterId: quarter.id,
          ars,
          batchId,
        })
      : null;
    const rows = row ? [row] : [];

    const summary = await persistProviderRows(admin, "uba", quarter, rows, {
      batchId,
      ars,
    });
    return { provider: "uba", quarter: quarter.slug, ...summary };
  } catch (error) {
    await writeSyncLog(admin, {
      batch_id: batchId,
      provider: "uba",
      quarter_id: quarter.id,
      ars,
      status: "error",
      finished_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function persistProviderRows(
  admin: AdminClient,
  provider: Provider,
  quarter: QuarterRow,
  rows: CacheInsert[],
  metadata: { batchId: string; ars: string; warncellId?: string },
) {
  const nowIso = new Date().toISOString();
  const existingResult = await admin
    .from("external_warning_cache")
    .select("id, external_id, external_version, status")
    .eq("provider", provider)
    .eq("quarter_id", quarter.id);

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existing = existingResult.data ?? [];
  const rowKeys = new Set(rows.map(createCacheKey));
  const rowIds = new Set(rows.map((row) => row.external_id));
  const existingKeys = new Set(existing.map(createExistingKey));

  const inserted = rows.filter((row) => !existingKeys.has(createCacheKey(row))).length;
  const unchanged = rows.length - inserted;

  if (rows.length > 0) {
    const upsertRows = rows.map((row) => ({
      ...row,
      last_seen_at: nowIso,
      fetch_batch_id: metadata.batchId,
    }));

    const upsertResult = await admin.from("external_warning_cache").upsert(upsertRows, {
      onConflict: "provider,external_id,external_version",
    });

    if (upsertResult.error) {
      throw upsertResult.error;
    }
  }

  const supersededIds = existing
    .filter(
      (row) =>
        row.status === "active" &&
        rowIds.has(row.external_id) &&
        !rowKeys.has(createExistingKey(row)),
    )
    .map((row) => row.id);

  if (supersededIds.length > 0) {
    const supersedeResult = await admin
      .from("external_warning_cache")
      .update({ status: "superseded" })
      .in("id", supersededIds);

    if (supersedeResult.error) {
      throw supersedeResult.error;
    }
  }

  const expiredIds = existing
    .filter(
      (row) =>
        row.status === "active" &&
        !rowIds.has(row.external_id) &&
        !rowKeys.has(createExistingKey(row)),
    )
    .map((row) => row.id);

  if (expiredIds.length > 0) {
    const expireResult = await admin
      .from("external_warning_cache")
      .update({ status: "expired" })
      .in("id", expiredIds);

    if (expireResult.error) {
      throw expireResult.error;
    }
  }

  await writeSyncLog(admin, {
    batch_id: metadata.batchId,
    provider,
    quarter_id: quarter.id,
    ars: metadata.ars,
    status: "success",
    warnings_fetched: rows.length,
    warnings_new: inserted,
    warnings_unchanged: unchanged,
    warnings_updated: supersededIds.length,
    warnings_expired: expiredIds.length,
    finished_at: nowIso,
  });

  return {
    fetched: rows.length,
    inserted,
    unchanged,
    expired: expiredIds.length,
  };
}

function createCacheKey(row: CacheInsert) {
  return `${row.external_id}::${row.external_version ?? ""}`;
}

function createExistingKey(row: {
  external_id: string;
  external_version: string | null;
}) {
  return `${row.external_id}::${row.external_version ?? ""}`;
}

async function writeSyncLog(admin: AdminClient, row: SyncLogInsert) {
  const insertResult = await admin.from("external_warning_sync_log").insert(row);
  if (insertResult.error) {
    console.error("[cron/external-warnings] sync log insert failed", insertResult.error);
  }
}

async function findFirstStationWithData(stations: UbaStation[]) {
  for (const station of stations) {
    const payload = await fetchUbaAirQuality(station.code);
    if ((payload.count ?? 0) > 0) {
      return { station, payload };
    }
  }

  return null;
}
