import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchNinaWarnings } from "@/modules/info-hub/services/nina-client";
import { randomUUID } from "crypto";

// AGS Landkreis Waldshut (Bad Saeckingen)
const AGS_WALDSHUT = "083370000000";

/**
 * GET /api/cron/nina-sync
 *
 * Prueft NINA-Warnungen alle 5 Minuten.
 * Neue Warnungen werden gespeichert + Push bei Severe/Extreme.
 * Vercel Cron: Alle 5 Min (* /5 * * * *)
 */
export async function GET(request: Request) {
  const requestId = randomUUID();

  // Cron-Secret pruefen
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // NINA-Warnungen holen
  const warnings = await fetchNinaWarnings(AGS_WALDSHUT);

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
          const pushUrl = `${supabaseUrl.replace(".supabase.co", "")}/api/push/send`;

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
  return NextResponse.json({
    message: "NINA-Sync abgeschlossen",
    requestId,
    ...results,
  });
}
