import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// VAPID-Konfiguration — lazy initialisiert, um Build-Fehler zu vermeiden
let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails("mailto:nachbar@nachbar.io", pub, priv);
    vapidConfigured = true;
    return true;
  } catch {
    console.error("VAPID-Konfiguration fehlgeschlagen");
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

  const body = await request.json();
  const { title, body: messageBody, url, tag, urgent, excludeUserId } = body;

  if (!title) {
    return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });
  }

  // URL-Validierung: Nur relative Pfade erlauben (kein Phishing)
  const safeUrl = (typeof url === "string" && url.startsWith("/")) ? url : "/dashboard";

  if (!ensureVapid()) {
    return NextResponse.json({ error: "Push nicht konfiguriert" }, { status: 503 });
  }

  // Alle Push-Subscriptions laden (ausser Absender)
  const query = supabase.from("push_subscriptions").select("*");
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
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    sent,
    failed,
    cleaned: expiredEndpoints.length,
  });
}
