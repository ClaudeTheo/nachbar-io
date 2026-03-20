import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { validateLocationData } from "@/lib/alerts/validate-location";

// GET /api/alerts — Alle aktiven Alerts abrufen (authentifiziert)
export async function GET() {
  const supabase = await createClient();

  // Auth-Check: Nur authentifizierte Nutzer duerfen Alerts sehen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .select(
      "*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng), responses:alert_responses(*, responder:users(display_name, avatar_url))"
    )
    .in("status", ["open", "help_coming"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Alerts-Abfrage fehlgeschlagen:", error);
    return NextResponse.json({ error: "Alerts konnten nicht geladen werden" }, { status: 500 });
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Anfrage-Format" }, { status: 400 });
  }
  const { category, title, description, household_id, is_emergency, location_lat, location_lng, location_source } = body;

  // Input-Validierung
  const VALID_CATEGORIES = ["noise", "package", "security", "fire", "health_concern", "medical", "crime", "other"];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Ungueltige Kategorie" }, { status: 400 });
  }
  if (!title || title.length < 3 || title.length > 200) {
    return NextResponse.json({ error: "Titel muss 3-200 Zeichen lang sein" }, { status: 400 });
  }
  // SICHERHEIT (H8): Beschreibung begrenzen
  if (description && (typeof description !== "string" || description.length > 2000)) {
    return NextResponse.json({ error: "Beschreibung darf maximal 2000 Zeichen lang sein" }, { status: 400 });
  }

  // GPS-Validierung
  const locValidation = validateLocationData(location_lat, location_lng, location_source);
  if (!locValidation.valid) {
    return NextResponse.json({ error: locValidation.error }, { status: 400 });
  }

  // Household-Ownership pruefen (falls angegeben)
  if (household_id) {
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", household_id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Sie gehoeren nicht zu diesem Haushalt" }, { status: 403 });
    }
  }

  // Quartier-ID des Nutzers ermitteln
  const quarterId = await getUserQuarterId(supabase, user.id);

  // Alert erstellen
  const { data: alert, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      household_id,
      category,
      title,
      description: description || null,
      location_lat: location_source && location_source !== "none" ? location_lat : null,
      location_lng: location_source && location_source !== "none" ? location_lng : null,
      location_source: location_source || "none",
      status: "open",
      is_emergency: is_emergency || false,
      current_radius: 1,
      quarter_id: quarterId,
    })
    .select()
    .single();

  if (error) {
    console.error("Alert-Erstellung fehlgeschlagen:", error);
    return NextResponse.json({ error: "Alert konnte nicht erstellt werden" }, { status: 500 });
  }

  // Push-Notifications an Quartiersmitglieder senden (interner Aufruf)
  try {
    const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://quartierapp.de";
    await fetch(`${baseUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
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
