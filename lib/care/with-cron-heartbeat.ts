// lib/care/with-cron-heartbeat.ts
// Nachbar.io — Cron-Wrapper: Auth + Heartbeat fuer alle Cron-Routes ohne eigenen Heartbeat
// Sorgt fuer FMEA-Monitoring-Vollabdeckung (alle Vercel-Crons sichtbar im Admin-Dashboard).

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/security/cron-secret";
import { writeCronHeartbeat, type CronJobId } from "@/lib/care/cron-heartbeat";
import { handleServiceError } from "@/lib/services/service-error";

// Akzeptiert sowohl Request als auch NextRequest (NextRequest extends Request).
// Beides ist im Next.js 13+ Route-Handler-Vertrag erlaubt.
type CronHandler<T> = (
  supabase: SupabaseClient,
  request: Request,
) => Promise<T>;

/**
 * Wrappt einen Cron-Handler mit:
 *  - Pflicht-Auth via CRON_SECRET (Bearer-Header)
 *  - Heartbeat-Write nach erfolgreichem Run (Result wird Metadata)
 *  - Einheitliches Error-Handling (handleServiceError)
 *
 * Heartbeat wird NUR geschrieben wenn der Handler erfolgreich durchlaeuft.
 * Bei Auth-Fehlern (500/401) oder Handler-Exception kein Heartbeat.
 *
 * Verwendung:
 *   export const GET = withCronHeartbeat("nina_sync", async (supabase, request) => {
 *     return await runNinaSync(supabase);
 *   });
 */
export function withCronHeartbeat<T>(
  jobId: CronJobId,
  handler: CronHandler<T>,
) {
  return async function (request: Request): Promise<NextResponse> {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "Server-Konfigurationsfehler" },
        { status: 500 },
      );
    }
    if (!verifyCronSecret(request.headers.get("authorization"), cronSecret)) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    try {
      const supabase = getAdminSupabase();
      const result = await handler(supabase, request);

      const metadata: Record<string, unknown> =
        result !== null && typeof result === "object" && !Array.isArray(result)
          ? (result as Record<string, unknown>)
          : { result };
      await writeCronHeartbeat(supabase, jobId, metadata);

      return NextResponse.json(result);
    } catch (error) {
      return handleServiceError(error);
    }
  };
}
