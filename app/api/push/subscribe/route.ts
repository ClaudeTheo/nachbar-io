import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/push/subscribe — Push-Subscription speichern
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription" },
      { status: 400 }
    );
  }

  // SICHERHEIT (M5): Push-Endpoint muss HTTPS sein
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return NextResponse.json(
      { error: "Push-Endpoint muss HTTPS verwenden" },
      { status: 400 }
    );
  }

  // Längenbeschränkung für Endpoint-URL
  if (endpoint.length > 2048) {
    return NextResponse.json(
      { error: "Push-Endpoint zu lang" },
      { status: 400 }
    );
  }

  // Bestehende Subscription löschen (falls vorhanden)
  const { error: deleteOldError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (deleteOldError) {
    console.error("Push-Subscription Bereinigung fehlgeschlagen:", deleteOldError.message);
  }

  // Neue Subscription speichern
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe — Push-Subscription entfernen
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges Anfrage-Format" }, { status: 400 });
  }
  const { endpoint } = body;

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: 'Vorgang fehlgeschlagen' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
