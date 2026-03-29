// modules/info-hub/services/nina-sync.service.ts
// Business-Logik fuer den NINA-Warn-Sync (Cron-Job)
// Extrahiert aus app/api/cron/nina-sync/route.ts fuer saubere Schichttrennung

import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { fetchNinaWarnings } from "@/modules/info-hub/services/nina-client";
import { ServiceError } from "@/lib/services/service-error";

// AGS Landkreis Waldshut (Bad Saeckingen)
const AGS_WALDSHUT = "083370000000";

export interface NinaSyncResult {
  message: string;
  requestId: string;
  new_warnings: number;
  known: number;
  push_sent: number;
  errors: number;
}

/**
 * Prueft NINA-Warnungen und speichert neue Eintraege.
 * Bei Severe/Extreme wird ein Push an alle Subscriber gesendet.
 * Aktualisiert anschliessend den quartier_info_cache fuer alle aktiven Quartiere.
 */
export async function runNinaSync(
  supabase: SupabaseClient,
): Promise<NinaSyncResult> {
  const requestId = randomUUID();

  // NINA-Warnungen holen
  let warnings: Awaited<ReturnType<typeof fetchNinaWarnings>>;
  try {
    warnings = await fetchNinaWarnings(AGS_WALDSHUT);
  } catch (err) {
    throw new ServiceError(`NINA-Fetch fehlgeschlagen: ${String(err)}`, 502);
  }

  const results = { new_warnings: 0, known: 0, push_sent: 0, errors: 0 };

  for (const warning of warnings) {
    // Pruefen ob Warnung bereits bekannt (Dedup via warning_id)
    const { data: existing } = await supabase
      .from("nina_warnings")
      .select("id")
      .eq("warning_id", warning.warning_id)
      .single();

    if (existing) {
      results.known++;
      continue;
    }

    // Neue Warnung: INSERT
    const { error: insertError } = await supabase.from("nina_warnings").insert({
      warning_id: warning.warning_id,
      ags: AGS_WALDSHUT,
      severity: warning.severity,
      headline: warning.headline,
      description: warning.description,
      sent_at: warning.sent_at,
      expires_at: warning.expires_at,
      push_sent: false,
    });

    if (insertError) {
      console.error(
        JSON.stringify({
          requestId,
          event: "nina_insert_error",
          error: insertError.message,
        }),
      );
      results.errors++;
      continue;
    }

    results.new_warnings++;

    // Push bei Severe oder Extreme
    if (warning.severity === "Severe" || warning.severity === "Extreme") {
      try {
        // Alle User mit Push-Subscription im Quartier benachrichtigen
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth");

        if (subscriptions?.length) {
          for (const sub of subscriptions) {
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || "https://nachbar-io.vercel.app"}/api/push/send`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
                  },
                  body: JSON.stringify({
                    subscription: {
                      endpoint: sub.endpoint,
                      keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    title: `⚠️ ${warning.headline}`,
                    body:
                      warning.description?.slice(0, 200) ||
                      "Neue Warnung vom Bundesamt",
                    url: "/quartier-info#warnungen",
                    tag: `nina-${warning.warning_id}`,
                  }),
                },
              );
              results.push_sent++;
            } catch {
              // Einzelne Push-Fehler nicht abbrechen
            }
          }
        }

        // push_sent markieren
        await supabase
          .from("nina_warnings")
          .update({ push_sent: true })
          .eq("warning_id", warning.warning_id);
      } catch (err) {
        console.error(
          JSON.stringify({
            requestId,
            event: "nina_push_error",
            error: String(err),
          }),
        );
      }
    }
  }

  // Cache-Update: Aktive Warnungen in quartier_info_cache
  const { data: activeWarnings } = await supabase
    .from("nina_warnings")
    .select("*")
    .or("expires_at.is.null,expires_at.gt.now()");

  // Fuer alle aktiven Quartiere den NINA-Cache updaten
  const { data: quarters } = await supabase
    .from("quarters")
    .select("id")
    .eq("active", true);

  if (quarters?.length && activeWarnings) {
    for (const quarter of quarters) {
      await supabase.from("quartier_info_cache").upsert(
        {
          quarter_id: quarter.id,
          source: "nina",
          data: activeWarnings,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 Min
        },
        { onConflict: "quarter_id,source" },
      );
    }
  }

  console.log(
    JSON.stringify({ requestId, event: "nina_sync_done", ...results }),
  );

  return {
    message: "NINA-Sync abgeschlossen",
    requestId,
    ...results,
  };
}
