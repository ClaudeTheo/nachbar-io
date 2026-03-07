import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/alerts — Alle aktiven Alerts abrufen
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alerts")
    .select(
      "*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng), responses:alert_responses(*, responder:users(display_name, avatar_url))"
    )
    .in("status", ["open", "help_coming"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/alerts — Neuen Alert erstellen und Nachbarn benachrichtigen
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const body = await request.json();
  const { category, title, description, household_id, is_emergency } = body;

  // Alert erstellen
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      household_id,
      category,
      title,
      description: description || null,
      status: "open",
      is_emergency: is_emergency || false,
      current_radius: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Push-Notifications an Quartiersmitglieder senden
  try {
    const baseUrl = request.nextUrl.origin;
    await fetch(`${baseUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        title: `${is_emergency ? "NOTFALL: " : ""}${title}`,
        body: description || "Neue Meldung in Ihrem Quartier",
        url: `/alerts`,
        tag: `alert-${alert.id}`,
        urgent: is_emergency || false,
        excludeUserId: user.id,
      }),
    });
  } catch (pushError) {
    // Push-Fehler blockiert nicht die Alert-Erstellung
    console.error("Push-Benachrichtigung fehlgeschlagen:", pushError);
  }

  return NextResponse.json(alert, { status: 201 });
}
