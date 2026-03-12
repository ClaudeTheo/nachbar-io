import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// VAPID-Konfiguration — lazy initialisiert
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

// POST /api/push/notify — Gezielte Push-Notification an einen bestimmten Nutzer
// Akzeptiert entweder INTERNAL_API_SECRET oder authentifizierte Supabase-Session
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Pruefung: Entweder internes Secret oder gueltige Session
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  const hasInternalSecret = expectedSecret && internalSecret === expectedSecret;

  if (!hasInternalSecret) {
    // Ohne internes Secret: Nur Admins duerfen Pushes an andere senden
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }
    // Admin-Check: Nur Admins duerfen gezielt pushen
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Nur Admins oder internes API-Secret" }, { status: 403 });
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }
  const { userId, title, body: messageBody, url, tag } = body;

  if (!userId || !title) {
    return NextResponse.json({ error: "userId und title erforderlich" }, { status: 400 });
  }

  // URL-Validierung: Nur relative Pfade erlauben
  const safeUrl = (typeof url === "string" && url.startsWith("/")) ? url : "/notifications";

  if (!ensureVapid()) {
    return NextResponse.json({ error: "Push nicht konfiguriert" }, { status: 503 });
  }

  // Push-Subscriptions des Ziel-Nutzers laden
  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (fetchError) {
    console.error("Push-Subscriptions laden fehlgeschlagen:", fetchError);
    return NextResponse.json({ error: "Subscriptions nicht ladbar" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nutzer hat keine Push-Subscriptions" });
  }

  const payload = JSON.stringify({
    title,
    body: messageBody,
    url: safeUrl,
    tag: tag || "nachbar-io",
    urgent: false,
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
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

  return NextResponse.json({ sent, failed, cleaned: expiredEndpoints.length });
}
