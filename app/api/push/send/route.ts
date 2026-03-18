import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// VAPID-Konfiguration — lazy initialisiert, um Build-Fehler zu vermeiden
let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) {
    console.error(`VAPID-Keys fehlen: pub=${pub ? "SET" : "MISSING"}(${pub?.length ?? 0}), priv=${priv ? "SET" : "MISSING"}(${priv?.length ?? 0})`);
    return false;
  }
  try {
    webpush.setVapidDetails("mailto:nachbar@nachbar.io", pub, priv);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("VAPID-Konfiguration fehlgeschlagen:", err);
    return false;
  }
}

// POST /api/push/send — Push-Notification an Quartiersmitglieder senden
// Nur intern aufrufbar (per INTERNAL_API_SECRET)
export async function POST(request: NextRequest) {
  // Internes Secret pruefen — nur andere API-Routes duerfen Push senden
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret || internalSecret !== expectedSecret) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }
  const { title, body: messageBody, url, tag, urgent, excludeUserId } = body;

  if (!title) {
    return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
  }

  // URL-Validierung: Nur relative Pfade erlauben (kein Phishing)
  const safeUrl = (typeof url === "string" && url.startsWith("/")) ? url : "/dashboard";

  if (!ensureVapid()) {
    return NextResponse.json({ error: "Push nicht konfiguriert" }, { status: 503 });
  }

  // Alle Push-Subscriptions laden (ausser Absender, max 5000)
  const query = supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .limit(5000);
  if (excludeUserId) {
    query.neq("user_id", excludeUserId);
  }
  const { data: subscriptions, error: fetchError } = await query;

  if (fetchError) {
    console.error("Push-Subscriptions laden fehlgeschlagen:", fetchError);
    return NextResponse.json({ error: "Empfaenger konnten nicht geladen werden" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: "Keine Empfänger gefunden" });
  }

  // Push-Payload erstellen (mit validierter URL)
  const payload = JSON.stringify({
    title,
    body: messageBody,
    url: safeUrl,
    tag: tag || "nachbar-io",
    urgent: urgent || false,
  });

  // An alle Subscriptions senden
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          { TTL: 3600 }
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  // Abgelaufene Subscriptions aufraeumen
  if (expiredEndpoints.length > 0) {
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
    if (cleanupError) {
      console.error("Push-Cleanup fehlgeschlagen:", cleanupError.message);
    }
  }

  return NextResponse.json({
    sent,
    failed,
    cleaned: expiredEndpoints.length,
  });
}
